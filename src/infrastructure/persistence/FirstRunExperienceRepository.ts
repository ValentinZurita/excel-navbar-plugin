export const firstRunExperienceStorageKey = 'sheetNavigator.fre.v1';

const dismissedMarker = 'dismissed';

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasDismissedFirstRunExperience(): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(firstRunExperienceStorageKey) === dismissedMarker;
  } catch {
    return false;
  }
}

export function dismissFirstRunExperience(): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(firstRunExperienceStorageKey, dismissedMarker);
  } catch {
    // The current task-pane session can still continue if storage is blocked.
  }
}
