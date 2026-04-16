import {
  workbookSettingsFallbackKey,
  workbookSettingsKey,
  workbookSettingsMetadataKey,
} from '../../domain/navigation/constants';
import type {
  LegacyPersistedNavigationModel,
  PersistedNavigationModel,
  PersistenceMetadata,
} from '../../domain/navigation/types';

function hasDocumentSettings() {
  return typeof Office !== 'undefined' && Boolean(Office.context?.document?.settings);
}

function parseLegacyModel(rawValue: unknown): LegacyPersistedNavigationModel | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null;
  }

  const candidate = rawValue as LegacyPersistedNavigationModel;
  return candidate.metadataVersion === 1 ? candidate : null;
}

function parsePersistedModel(rawValue: unknown): PersistedNavigationModel | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null;
  }

  const candidate = rawValue as PersistedNavigationModel;
  return candidate.schemaVersion === 2 ? candidate : null;
}

function parseMetadata(rawValue: unknown): PersistenceMetadata | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null;
  }

  const candidate = rawValue as PersistenceMetadata;
  return candidate.schemaVersion === 2 ? candidate : null;
}

export class SettingsMetadataRepository {
  readLegacyModel(): LegacyPersistedNavigationModel | null {
    if (!hasDocumentSettings()) {
      return null;
    }

    return parseLegacyModel(Office.context.document.settings.get(workbookSettingsKey));
  }

  removeLegacyModel() {
    if (!hasDocumentSettings()) {
      return;
    }

    Office.context.document.settings.remove(workbookSettingsKey);
  }

  readFallbackModel(): PersistedNavigationModel | null {
    if (!hasDocumentSettings()) {
      return null;
    }

    return parsePersistedModel(Office.context.document.settings.get(workbookSettingsFallbackKey));
  }

  writeFallbackModel(model: PersistedNavigationModel) {
    if (!hasDocumentSettings()) {
      throw new Error('Document settings are unavailable.');
    }

    Office.context.document.settings.set(workbookSettingsFallbackKey, model);
  }

  removeFallbackModel() {
    if (!hasDocumentSettings()) {
      return;
    }

    Office.context.document.settings.remove(workbookSettingsFallbackKey);
  }

  readMetadata(): PersistenceMetadata | null {
    if (!hasDocumentSettings()) {
      return null;
    }

    return parseMetadata(Office.context.document.settings.get(workbookSettingsMetadataKey));
  }

  writeMetadata(metadata: PersistenceMetadata) {
    if (!hasDocumentSettings()) {
      throw new Error('Document settings are unavailable.');
    }

    Office.context.document.settings.set(workbookSettingsMetadataKey, metadata);
  }

  async save() {
    if (!hasDocumentSettings()) {
      throw new Error('Document settings are unavailable.');
    }

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
}
