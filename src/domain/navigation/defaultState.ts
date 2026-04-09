import type { NavigationState } from './types';

export function createDefaultNavigationState(): NavigationState {
  return {
    worksheetsById: {},
    groupsById: {},
    groupOrder: [],
    hiddenSectionCollapsed: true,
    query: '',
    activeWorksheetId: null,
    lastSyncAt: null,
    isReady: false,
  };
}
