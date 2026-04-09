import { metadataVersion } from './constants';
import type { NavigationState, PersistedNavigationModel, StructuralState } from './types';

export function toPersistedModel(state: NavigationState): PersistedNavigationModel {
  const priorStructuralStateByWorksheetId = Object.values(state.worksheetsById).reduce<Record<string, StructuralState | null>>(
    (accumulator, worksheet) => {
      accumulator[worksheet.worksheetId] = worksheet.lastKnownStructuralState;
      return accumulator;
    },
    {},
  );

  return {
    metadataVersion,
    groups: state.groupOrder.map((groupId) => state.groupsById[groupId]).filter(Boolean),
    pinnedWorksheetIds: Object.values(state.worksheetsById)
      .filter((worksheet) => worksheet.isPinned)
      .sort((left, right) => left.workbookOrder - right.workbookOrder)
      .map((worksheet) => worksheet.worksheetId),
    hiddenSectionCollapsed: state.hiddenSectionCollapsed,
    priorStructuralStateByWorksheetId,
  };
}
