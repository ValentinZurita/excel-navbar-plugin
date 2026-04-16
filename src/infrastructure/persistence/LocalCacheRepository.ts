import { buildScopedLocalCacheKey, legacyLocalCacheKey } from '../../domain/navigation/constants';
import type { PersistedNavigationModel } from '../../domain/navigation/types';

function hasWindowLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function parseModel(rawValue: string | null): PersistedNavigationModel | null {
  if (!rawValue) {
    return null;
  }

  try {
    const candidate = JSON.parse(rawValue) as PersistedNavigationModel;
    return candidate?.schemaVersion === 2 ? candidate : null;
  } catch {
    return null;
  }
}

export class LocalCacheRepository {
  private legacyCacheCleaned = false;

  cleanupLegacyGlobalCache() {
    if (this.legacyCacheCleaned || !hasWindowLocalStorage()) {
      return;
    }

    try {
      window.localStorage.removeItem(legacyLocalCacheKey);
    } catch {
      // Ignore cleanup failures.
    }

    this.legacyCacheCleaned = true;
  }

  read(stableWorkbookKey: string): PersistedNavigationModel | null {
    if (!hasWindowLocalStorage()) {
      return null;
    }

    return parseModel(window.localStorage.getItem(buildScopedLocalCacheKey(stableWorkbookKey)));
  }

  write(stableWorkbookKey: string, model: PersistedNavigationModel) {
    if (!hasWindowLocalStorage()) {
      throw new Error('Local storage is unavailable.');
    }

    window.localStorage.setItem(buildScopedLocalCacheKey(stableWorkbookKey), JSON.stringify(model));
  }
}
