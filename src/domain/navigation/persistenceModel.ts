import { metadataVersion } from './constants';
import { dedupeWorksheetIds } from './utils';
import type { NavigationState, PersistedNavigationModel, StructuralState } from './types';

export function toPersistedModel(state: NavigationState): PersistedNavigationModel {
  const priorStructuralStateByWorksheetId = Object.values(state.worksheetsById).reduce<
    Record<string, StructuralState | null>
  >(
    (accumulator, worksheet) => {
      accumulator[worksheet.worksheetId] = worksheet.lastKnownStructuralState;
      return accumulator;
    },
    {},
  );

  // Use custom pinned order if available, otherwise fallback to workbookOrder
  const pinnedWorksheetIds = state.pinnedWorksheetOrder.length
    ? dedupeWorksheetIds(state.pinnedWorksheetOrder).filter((id) => state.worksheetsById[id]?.isPinned)
    : Object.values(state.worksheetsById)
        .filter((worksheet) => worksheet.isPinned)
        .sort((left, right) => left.workbookOrder - right.workbookOrder)
        .map((worksheet) => worksheet.worksheetId);

  return {
    metadataVersion,
    groups: state.groupOrder.map((groupId) => state.groupsById[groupId]).filter(Boolean),
    sheetSectionOrder: state.sheetSectionOrder,
    pinnedWorksheetIds,
    pinnedWorksheetOrder: state.pinnedWorksheetOrder.length ? state.pinnedWorksheetOrder : undefined,
    hiddenSectionCollapsed: state.hiddenSectionCollapsed,
    priorStructuralStateByWorksheetId,
  };
}
