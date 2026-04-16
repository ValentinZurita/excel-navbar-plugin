import type { NavigationState } from './types';

export function createDefaultNavigationState(): NavigationState {
  return {
    worksheetsById: {},
    groupsById: {},
    groupOrder: [],
    sheetSectionOrder: [],
    pinnedWorksheetOrder: [],
    hiddenSectionCollapsed: true,
    query: '',
    activeWorksheetId: null,
    lastSyncAt: null,
    isReady: false,
    identityMode: 'native-id',
  };
}
