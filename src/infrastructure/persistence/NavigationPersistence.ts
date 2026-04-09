import { localCacheKey, workbookSettingsKey } from '../../domain/navigation/constants';
import type { PersistedNavigationModel } from '../../domain/navigation/types';

function parseModel(rawValue: unknown): PersistedNavigationModel | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null;
  }

  const candidate = rawValue as PersistedNavigationModel;
  return candidate.metadataVersion === 1 ? candidate : null;
}

function hasOfficeDocumentSettings() {
  return typeof Office !== 'undefined' && Boolean(Office.context?.document?.settings);
}

export class NavigationPersistence {
  async load(): Promise<PersistedNavigationModel | null> {
    const workbookValue = hasOfficeDocumentSettings()
      ? parseModel(Office.context.document.settings.get(workbookSettingsKey))
      : null;

    if (workbookValue) {
      return workbookValue;
    }

    const cachedValue = window.localStorage.getItem(localCacheKey);
    if (!cachedValue) {
      return null;
    }

    try {
      return parseModel(JSON.parse(cachedValue));
    } catch {
      return null;
    }
  }

  async save(model: PersistedNavigationModel): Promise<void> {
    window.localStorage.setItem(localCacheKey, JSON.stringify(model));

    if (!hasOfficeDocumentSettings()) {
      return;
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
}
