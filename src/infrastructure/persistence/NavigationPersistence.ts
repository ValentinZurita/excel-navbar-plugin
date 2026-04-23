import { migrateLegacyPersistedNavigationModel } from '../../domain/navigation/migration';
import { createPersistedModelFingerprint } from '../../domain/navigation/persistenceModel';
import { reconcilePersistedNavigationModel } from '../../domain/navigation/reconciliation';
import type {
  PersistedNavigationModel,
  PersistenceDiagnosticCode,
  PersistenceMetadata,
  PersistenceStatus,
  SaveResult,
  WorkbookPersistenceContext,
  WorkbookSnapshot,
} from '../../domain/navigation/types';
import { CustomXmlNavigationRepository } from './CustomXmlNavigationRepository';
import { LocalCacheRepository } from './LocalCacheRepository';
import { SettingsMetadataRepository } from './SettingsMetadataRepository';

function createSessionOnlyStatus(
  lastSource: PersistenceStatus['lastSource'],
  diagnostics: PersistenceDiagnosticCode[],
): PersistenceStatus {
  return {
    mode: 'session-only',
    banner: {
      tone: 'info',
      message:
        'This workbook does not have a stable file identity yet. Local recovery is unavailable until the file is saved.',
    },
    lastSource,
    diagnostics,
  };
}

function createHealthyStatus(
  context: WorkbookPersistenceContext,
  lastSource: PersistenceStatus['lastSource'],
  diagnostics: PersistenceDiagnosticCode[],
): PersistenceStatus {
  if (context.mode === 'session-only') {
    return createSessionOnlyStatus(lastSource, diagnostics);
  }

  if (!context.supportsCustomXml) {
    return {
      mode: 'settings-fallback',
      banner: {
        tone: 'warning',
        message:
          'This Excel host is using a compatibility persistence path because Custom XML storage is unavailable.',
      },
      lastSource,
      diagnostics,
    };
  }

  return {
    mode: 'custom-xml',
    banner: null,
    lastSource,
    diagnostics,
  };
}

function createDegradedStatus(
  context: WorkbookPersistenceContext,
  lastSource: PersistenceStatus['lastSource'],
  diagnostics: PersistenceDiagnosticCode[],
  error: unknown,
): PersistenceStatus {
  const lastError = error instanceof Error ? error.message : String(error);

  if (context.stableWorkbookKey) {
    return {
      mode: 'degraded',
      banner: {
        tone: 'warning',
        message:
          'We could not save to the workbook canonical store, but your navigation state was cached locally for this workbook on this device.',
      },
      lastSource,
      diagnostics,
      lastError,
    };
  }

  return {
    mode: 'degraded',
    banner: {
      tone: 'warning',
      message:
        'We could not save this workbook state, and local recovery is unavailable until the file is saved.',
    },
    lastSource,
    diagnostics,
    lastError,
  };
}

function buildMetadata(
  model: PersistedNavigationModel,
  canonicalStore: PersistenceMetadata['canonicalStore'],
): PersistenceMetadata {
  return {
    schemaVersion: 2,
    canonicalStore,
    identityMode: model.identityMode,
    updatedAt: model.updatedAt,
  };
}

function mergeDiagnostics(...diagnosticGroups: PersistenceDiagnosticCode[][]) {
  return [...new Set(diagnosticGroups.flat())];
}

export class NavigationPersistence {
  private readonly customXmlRepository = new CustomXmlNavigationRepository();

  private readonly settingsRepository = new SettingsMetadataRepository();

  private readonly localCacheRepository = new LocalCacheRepository();

  private lastSavedFingerprint: string | null = null;

  private lastSavedWorkbookKey: string | null = null;

  private lastSavedUpdatedAt: number = 0;

  private decorateDiagnostics(
    context: WorkbookPersistenceContext,
    diagnostics: PersistenceDiagnosticCode[],
  ) {
    const decoratedDiagnostics = [...diagnostics];

    if (!context.supportsCustomXml) {
      decoratedDiagnostics.push('custom_xml_unavailable');
    }

    if (!context.supportsWorksheetCustomProperties) {
      decoratedDiagnostics.push('fallback_to_native_identity');
    }

    return [...new Set(decoratedDiagnostics)];
  }

  private async writeCanonicalStore(
    context: WorkbookPersistenceContext,
    model: PersistedNavigationModel,
  ): Promise<PersistenceStatus['lastSource']> {
    if (context.supportsCustomXml) {
      await this.customXmlRepository.save(model);

      if (context.documentSettingsAvailable) {
        try {
          this.settingsRepository.writeMetadata(buildMetadata(model, 'custom-xml'));
          this.settingsRepository.removeLegacyModel();
          this.settingsRepository.removeFallbackModel();
          await this.settingsRepository.save();
        } catch {
          // Metadata is secondary to the canonical workbook store.
        }
      }

      return 'custom-xml';
    }

    if (!context.documentSettingsAvailable) {
      throw new Error('Document settings are unavailable for compatibility persistence.');
    }

    this.settingsRepository.writeFallbackModel(model);
    this.settingsRepository.writeMetadata(buildMetadata(model, 'settings-fallback'));
    this.settingsRepository.removeLegacyModel();
    await this.settingsRepository.save();
    return 'settings-fallback';
  }

  private async hydrateFromLocalCache(context: WorkbookPersistenceContext) {
    if (!context.stableWorkbookKey) {
      return null;
    }

    const cachedModel = this.localCacheRepository.read(context.stableWorkbookKey);
    if (!cachedModel) {
      return null;
    }

    try {
      await this.writeCanonicalStore(context, cachedModel);
    } catch {
      // Keep using the local recovery source even if canonical rehydration fails.
    }

    return cachedModel;
  }

  async load(
    context: WorkbookPersistenceContext,
    snapshot: WorkbookSnapshot,
  ): Promise<{ model: PersistedNavigationModel | null; status: PersistenceStatus }> {
    this.localCacheRepository.cleanupLegacyGlobalCache();

    let model: PersistedNavigationModel | null = null;
    let lastSource: PersistenceStatus['lastSource'] = 'none';
    const diagnostics: PersistenceDiagnosticCode[] = [];

    if (context.supportsCustomXml) {
      try {
        model = await this.customXmlRepository.load();
        if (model) {
          lastSource = 'custom-xml';
        }
      } catch {
        diagnostics.push('custom_xml_corrupt');
      }
    } else if (context.documentSettingsAvailable) {
      model = this.settingsRepository.readFallbackModel();
      if (model) {
        lastSource = 'settings-fallback';
      }
    }

    if (!model && context.documentSettingsAvailable) {
      const legacyModel = this.settingsRepository.readLegacyModel();
      if (legacyModel) {
        model = migrateLegacyPersistedNavigationModel(
          legacyModel,
          snapshot,
          context.supportsWorksheetCustomProperties ? 'plugin-sheet-id' : 'native-id',
        );
        diagnostics.push('migrated_from_settings_v1');
        lastSource = 'legacy-settings';

        try {
          await this.writeCanonicalStore(context, model);
        } catch {
          // Keep migrated in-memory model even if canonical write fails.
        }
      }
    }

    if (!model) {
      const cachedModel = await this.hydrateFromLocalCache(context);
      if (cachedModel) {
        model = cachedModel;
        diagnostics.push('recovered_from_local_cache');
        lastSource = 'scoped-local-cache';
      }
    }

    if (!model) {
      return {
        model: null,
        status: createHealthyStatus(
          context,
          'none',
          this.decorateDiagnostics(context, diagnostics),
        ),
      };
    }

    const reconciled = reconcilePersistedNavigationModel(snapshot, model);
    model = reconciled.model;
    const allDiagnostics = this.decorateDiagnostics(
      context,
      mergeDiagnostics(diagnostics, reconciled.diagnostics),
    );

    if (
      reconciled.changed ||
      lastSource === 'legacy-settings' ||
      lastSource === 'scoped-local-cache'
    ) {
      try {
        model = {
          ...model,
          updatedAt: Date.now(),
        };
        await this.writeCanonicalStore(context, model);
      } catch {
        // Load should still succeed with the reconciled model.
      }
    }

    return {
      model,
      status: createHealthyStatus(context, lastSource, allDiagnostics),
    };
  }

  async save(
    context: WorkbookPersistenceContext,
    model: PersistedNavigationModel,
  ): Promise<SaveResult> {
    this.localCacheRepository.cleanupLegacyGlobalCache();

    const diagnostics = this.decorateDiagnostics(context, []);
    const fingerprint = createPersistedModelFingerprint(model);
    const workbookKey = context.stableWorkbookKey ?? 'session-only';

    if (this.lastSavedFingerprint === fingerprint && this.lastSavedWorkbookKey === workbookKey) {
      return {
        status: createHealthyStatus(
          context,
          context.supportsCustomXml ? 'custom-xml' : 'settings-fallback',
          diagnostics,
        ),
        savedUpdatedAt: this.lastSavedUpdatedAt,
      };
    }

    const modelToWrite: PersistedNavigationModel = {
      ...model,
      updatedAt: Date.now(),
    };

    try {
      const lastSource = await this.writeCanonicalStore(context, modelToWrite);

      if (context.stableWorkbookKey) {
        try {
          this.localCacheRepository.write(context.stableWorkbookKey, modelToWrite);
        } catch {
          // Ignore backup cache errors on healthy canonical saves.
        }
      }

      this.lastSavedFingerprint = fingerprint;
      this.lastSavedWorkbookKey = workbookKey;
      this.lastSavedUpdatedAt = modelToWrite.updatedAt;

      return {
        status: createHealthyStatus(context, lastSource, diagnostics),
        savedUpdatedAt: modelToWrite.updatedAt,
      };
    } catch (error) {
      try {
        if (context.stableWorkbookKey) {
          this.localCacheRepository.write(context.stableWorkbookKey, modelToWrite);
          return {
            status: createDegradedStatus(context, 'scoped-local-cache', diagnostics, error),
            savedUpdatedAt: modelToWrite.updatedAt,
          };
        }
      } catch {
        // fall through to degraded-without-cache
      }

      return {
        status: createDegradedStatus(context, 'none', diagnostics, error),
        savedUpdatedAt: modelToWrite.updatedAt,
      };
    }
  }
}
