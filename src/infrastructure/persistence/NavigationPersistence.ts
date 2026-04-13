import {
  buildScopedLocalCacheKey,
  legacyLocalCacheKey,
  workbookSettingsKey,
} from '../../domain/navigation/constants';
import type {
  PersistedNavigationModel,
  PersistenceStatus,
  WorkbookPersistenceContext,
} from '../../domain/navigation/types';

function parseModel(rawValue: unknown): PersistedNavigationModel | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null;
  }

  const candidate = rawValue as PersistedNavigationModel;
  return candidate.metadataVersion === 1 ? candidate : null;
}

function hasWindowLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function createSessionOnlyStatus(lastSource: PersistenceStatus['lastSource']): PersistenceStatus {
  return {
    mode: 'session-only',
    banner: {
      tone: 'info',
      message: 'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
    },
    lastSource,
  };
}

function createHealthyStatus(context: WorkbookPersistenceContext, lastSource: PersistenceStatus['lastSource']): PersistenceStatus {
  if (context.mode === 'session-only') {
    return createSessionOnlyStatus(lastSource);
  }

  return {
    mode: 'document+local-cache',
    banner: null,
    lastSource,
  };
}

function createDocumentOnlyStatus(lastSource: PersistenceStatus['lastSource']): PersistenceStatus {
  return {
    mode: 'document-only',
    banner: null,
    lastSource,
  };
}

function createDegradedStatus(context: WorkbookPersistenceContext, lastSource: PersistenceStatus['lastSource'], error: unknown): PersistenceStatus {
  const lastError = error instanceof Error ? error.message : String(error);

  if (context.stableWorkbookKey) {
    return {
      mode: 'degraded',
      banner: {
        tone: 'warning',
        message: 'We could not save to this workbook, but your navigation state was cached locally for this workbook on this device.',
      },
      lastSource,
      lastError,
    };
  }

  return {
    mode: 'degraded',
    banner: {
      tone: 'warning',
      message: 'We could not save this workbook state, and this workbook does not have a stable file identity yet. Your changes might not persist.',
    },
    lastSource,
    lastError,
  };
}

export class NavigationPersistence {
  private legacyCacheCleaned = false;

  private cleanupLegacyLocalCache() {
    if (this.legacyCacheCleaned || !hasWindowLocalStorage()) {
      return;
    }

    try {
      window.localStorage.removeItem(legacyLocalCacheKey);
    } catch {
      // Ignore cleanup failures. The important behavior is never reading the legacy key again.
    }

    this.legacyCacheCleaned = true;
  }

  private readDocumentSettingsModel() {
    if (!contextHasDocumentSettings()) {
      return null;
    }

    return parseModel(Office.context.document.settings.get(workbookSettingsKey));
  }

  private writeScopedLocalCache(stableWorkbookKey: string, model: PersistedNavigationModel) {
    if (!hasWindowLocalStorage()) {
      throw new Error('Local storage is unavailable.');
    }

    window.localStorage.setItem(buildScopedLocalCacheKey(stableWorkbookKey), JSON.stringify(model));
  }

  private readScopedLocalCache(stableWorkbookKey: string) {
    if (!hasWindowLocalStorage()) {
      return null;
    }

    const cachedValue = window.localStorage.getItem(buildScopedLocalCacheKey(stableWorkbookKey));
    if (!cachedValue) {
      return null;
    }

    try {
      return parseModel(JSON.parse(cachedValue));
    } catch {
      return null;
    }
  }

  private async saveToDocumentSettings(model: PersistedNavigationModel) {
    if (!contextHasDocumentSettings()) {
      throw new Error('Document settings are unavailable.');
    }

    Office.context.document.settings.set(workbookSettingsKey, model);

    await new Promise<void>((resolve, reject) => {
      Office.context.document.settings.saveAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          reject(result.error);
          return;
        }
        resolve();
      });
    });
  }

  async load(context: WorkbookPersistenceContext): Promise<{ model: PersistedNavigationModel | null; status: PersistenceStatus }> {
    this.cleanupLegacyLocalCache();

    const documentModel = this.readDocumentSettingsModel();
    if (documentModel) {
      return {
        model: documentModel,
        status: context.stableWorkbookKey
          ? createHealthyStatus(context, 'document-settings')
          : createDocumentOnlyStatus('document-settings'),
      };
    }

    if (context.stableWorkbookKey) {
      const scopedCacheModel = this.readScopedLocalCache(context.stableWorkbookKey);
      if (scopedCacheModel) {
        if (context.documentSettingsAvailable) {
          try {
            await this.saveToDocumentSettings(scopedCacheModel);
          } catch {
            // Keep the local cache as the recovered source even if canonical rehydration fails.
          }
        }

        return {
          model: scopedCacheModel,
          status: createHealthyStatus(context, 'scoped-local-cache'),
        };
      }
    }

    const status = context.mode === 'session-only'
      ? createSessionOnlyStatus('none')
      : createHealthyStatus(context, 'none');

    return { model: null, status };
  }

  async save(context: WorkbookPersistenceContext, model: PersistedNavigationModel): Promise<PersistenceStatus> {
    this.cleanupLegacyLocalCache();

    if (context.mode === 'session-only') {
      try {
        if (context.documentSettingsAvailable) {
          await this.saveToDocumentSettings(model);
        }
      } catch (error) {
        return createDegradedStatus(context, 'none', error);
      }

      return createSessionOnlyStatus('none');
    }

    let localCacheWritten = false;
    try {
      if (context.stableWorkbookKey) {
        this.writeScopedLocalCache(context.stableWorkbookKey, model);
        localCacheWritten = true;
      }
    } catch {
      localCacheWritten = false;
    }

    try {
      await this.saveToDocumentSettings(model);

      if (!localCacheWritten) {
        return createDocumentOnlyStatus('document-settings');
      }

      return createHealthyStatus(context, 'document-settings');
    } catch (error) {
      return createDegradedStatus(context, localCacheWritten ? 'scoped-local-cache' : 'none', error);
    }
  }
}

function contextHasDocumentSettings() {
  return typeof Office !== 'undefined' && Boolean(Office.context?.document?.settings);
}
