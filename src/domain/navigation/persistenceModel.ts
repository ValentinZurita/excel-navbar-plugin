import { persistedSchemaVersion } from './constants';
import { dedupeWorksheetIds, getStableWorksheetId } from './utils';
import type { NavigationState, PersistedNavigationModel, StructuralState } from './types';

export function toPersistedModel(state: NavigationState): PersistedNavigationModel {
  const priorStructuralStateByWorksheetId = Object.values(state.worksheetsById).reduce<
    Record<string, StructuralState | null>
  >((accumulator, worksheet) => {
    accumulator[getStableWorksheetId(worksheet)] = worksheet.lastKnownStructuralState;
    return accumulator;
  }, {});

  const pinnedWorksheetOrder = state.pinnedWorksheetOrder.length
    ? dedupeWorksheetIds(state.pinnedWorksheetOrder).filter(
        (id) => state.worksheetsById[id]?.isPinned,
      )
    : Object.values(state.worksheetsById)
        .filter((worksheet) => worksheet.isPinned)
        .sort((left, right) => left.workbookOrder - right.workbookOrder)
        .map((worksheet) => getStableWorksheetId(worksheet));

  return {
    schemaVersion: persistedSchemaVersion,
    identityMode: state.identityMode,
    groups: state.groupOrder.map((groupId) => state.groupsById[groupId]).filter(Boolean),
    sheetSectionOrder: state.sheetSectionOrder,
    pinnedWorksheetOrder,
    hiddenSectionCollapsed: state.hiddenSectionCollapsed,
    priorStructuralStateByStableWorksheetId: priorStructuralStateByWorksheetId,
    updatedAt: 0,
  };
}

export function createPersistedModelFingerprint(model: PersistedNavigationModel) {
  const { updatedAt: _updatedAt, ...rest } = model;
  return JSON.stringify(rest);
}
