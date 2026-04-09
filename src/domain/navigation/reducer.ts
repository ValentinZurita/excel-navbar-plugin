import { createDefaultNavigationState } from './defaultState';
import { groupColorTokens } from './constants';
import type {
  GroupColorToken,
  GroupEntity,
  NavigationState,
  PersistedNavigationModel,
  StructuralState,
  WorkbookSnapshot,
  WorksheetEntity,
} from './types';

export type NavigationAction =
  | { type: 'hydrateFromWorkbook'; snapshot: WorkbookSnapshot }
  | { type: 'hydrateFromPersistence'; model: PersistedNavigationModel | null }
  | { type: 'setQuery'; query: string }
  | { type: 'toggleGroupCollapsed'; groupId: string }
  | { type: 'toggleHiddenSection' }
  | { type: 'createGroup'; name: string; colorToken?: GroupColorToken }
  | { type: 'renameGroup'; groupId: string; name: string }
  | { type: 'deleteGroup'; groupId: string }
  | { type: 'assignWorksheetToGroup'; worksheetId: string; groupId: string }
  | { type: 'removeWorksheetFromGroup'; worksheetId: string }
  | { type: 'pinWorksheet'; worksheetId: string }
  | { type: 'unpinWorksheet'; worksheetId: string }
  | { type: 'markWorksheetUnhidden'; worksheetId: string }
  | { type: 'renameWorksheetLocally'; worksheetId: string; name: string };

function nextGroupColor(index: number): GroupColorToken {
  return groupColorTokens[index % groupColorTokens.length];
}

function toWorksheetEntity(snapshotWorksheet: WorkbookSnapshot['worksheets'][number], existing: WorksheetEntity | undefined): WorksheetEntity {
  return {
    worksheetId: snapshotWorksheet.worksheetId,
    name: snapshotWorksheet.name,
    visibility: snapshotWorksheet.visibility,
    workbookOrder: snapshotWorksheet.workbookOrder,
    isPinned: existing?.isPinned ?? false,
    groupId: existing?.groupId ?? null,
    lastKnownStructuralState: existing?.lastKnownStructuralState ?? null,
  };
}

function applyPinnedState(state: NavigationState, pinnedWorksheetIds: string[]) {
  Object.values(state.worksheetsById).forEach((worksheet) => {
    worksheet.isPinned = pinnedWorksheetIds.includes(worksheet.worksheetId) && worksheet.groupId === null;
    if (worksheet.isPinned) {
      worksheet.lastKnownStructuralState = { kind: 'pinned' };
    }
  });
}

function applyPersistence(state: NavigationState, model: PersistedNavigationModel | null) {
  if (!model) {
    return state;
  }

  state.groupsById = model.groups.reduce<Record<string, GroupEntity>>((accumulator, group) => {
    accumulator[group.groupId] = group;
    return accumulator;
  }, {});
  state.groupOrder = model.groups.map((group) => group.groupId);
  state.hiddenSectionCollapsed = model.hiddenSectionCollapsed;

  Object.values(state.worksheetsById).forEach((worksheet) => {
    worksheet.lastKnownStructuralState = model.priorStructuralStateByWorksheetId[worksheet.worksheetId] ?? null;
  });

  for (const group of model.groups) {
    for (const worksheetId of group.worksheetOrder) {
      const worksheet = state.worksheetsById[worksheetId];
      if (!worksheet) {
        continue;
      }
      worksheet.groupId = group.groupId;
      worksheet.isPinned = false;
      worksheet.lastKnownStructuralState = { kind: 'group', groupId: group.groupId };
    }
  }

  applyPinnedState(state, model.pinnedWorksheetIds);
  return state;
}

function removeWorksheetFromAnyGroup(state: NavigationState, worksheetId: string) {
  const worksheet = state.worksheetsById[worksheetId];
  if (!worksheet?.groupId) {
    return;
  }

  const group = state.groupsById[worksheet.groupId];
  if (group) {
    group.worksheetOrder = group.worksheetOrder.filter((candidateId) => candidateId !== worksheetId);
  }

  worksheet.groupId = null;
  worksheet.lastKnownStructuralState = { kind: 'ungrouped' };
}

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'hydrateFromWorkbook': {
      const nextState: NavigationState = {
        ...state,
        worksheetsById: action.snapshot.worksheets.reduce<Record<string, WorksheetEntity>>((accumulator, worksheet) => {
          accumulator[worksheet.worksheetId] = toWorksheetEntity(worksheet, state.worksheetsById[worksheet.worksheetId]);
          return accumulator;
        }, {}),
        activeWorksheetId: action.snapshot.activeWorksheetId,
        lastSyncAt: Date.now(),
        isReady: true,
      };
      return nextState;
    }
    case 'hydrateFromPersistence': {
      const draft = {
        ...state,
        groupsById: { ...state.groupsById },
        groupOrder: [...state.groupOrder],
        worksheetsById: Object.fromEntries(
          Object.entries(state.worksheetsById).map(([key, value]) => [key, { ...value }]),
        ),
      };
      return applyPersistence(draft, action.model);
    }
    case 'setQuery':
      return { ...state, query: action.query };
    case 'toggleGroupCollapsed': {
      const group = state.groupsById[action.groupId];
      if (!group) {
        return state;
      }
      return {
        ...state,
        groupsById: {
          ...state.groupsById,
          [action.groupId]: { ...group, isCollapsed: !group.isCollapsed },
        },
      };
    }
    case 'toggleHiddenSection':
      return { ...state, hiddenSectionCollapsed: !state.hiddenSectionCollapsed };
    case 'createGroup': {
      const groupId = `group-${Date.now()}`;
      const group: GroupEntity = {
        groupId,
        name: action.name.trim(),
        colorToken: action.colorToken ?? nextGroupColor(state.groupOrder.length),
        isCollapsed: true,
        worksheetOrder: [],
        createdAt: Date.now(),
      };
      return {
        ...state,
        groupsById: { ...state.groupsById, [groupId]: group },
        groupOrder: [groupId, ...state.groupOrder],
      };
    }
    case 'renameGroup': {
      const group = state.groupsById[action.groupId];
      if (!group) {
        return state;
      }
      return {
        ...state,
        groupsById: {
          ...state.groupsById,
          [action.groupId]: { ...group, name: action.name.trim() },
        },
      };
    }
    case 'deleteGroup': {
      const nextGroups = { ...state.groupsById };
      delete nextGroups[action.groupId];

      const nextWorksheets: Record<string, WorksheetEntity> = Object.fromEntries(
        Object.entries(state.worksheetsById).map(([worksheetId, worksheet]) => {
          const nextWorksheet =
            worksheet.groupId === action.groupId
              ? {
                  ...worksheet,
                  groupId: null,
                  lastKnownStructuralState: { kind: 'ungrouped' as const },
                }
              : worksheet;

          return [worksheetId, nextWorksheet];
        }),
      );

      return {
        ...state,
        groupsById: nextGroups,
        groupOrder: state.groupOrder.filter((groupId) => groupId !== action.groupId),
        worksheetsById: nextWorksheets,
      };
    }
    case 'assignWorksheetToGroup': {
      const worksheet = state.worksheetsById[action.worksheetId];
      const group = state.groupsById[action.groupId];
      if (!worksheet || !group || worksheet.visibility !== 'Visible') {
        return state;
      }

      const nextState = {
        ...state,
        groupsById: Object.fromEntries(
          Object.entries(state.groupsById).map(([groupId, candidate]) => [groupId, { ...candidate, worksheetOrder: [...candidate.worksheetOrder] }]),
        ),
        worksheetsById: Object.fromEntries(
          Object.entries(state.worksheetsById).map(([key, value]) => [key, { ...value }]),
        ),
      };

      removeWorksheetFromAnyGroup(nextState, action.worksheetId);
      const nextWorksheet = nextState.worksheetsById[action.worksheetId];
      nextWorksheet.isPinned = false;
      nextWorksheet.groupId = action.groupId;
      nextWorksheet.lastKnownStructuralState = { kind: 'group', groupId: action.groupId };
      nextState.groupsById[action.groupId].worksheetOrder.push(action.worksheetId);
      return nextState;
    }
    case 'removeWorksheetFromGroup': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet) {
        return state;
      }
      const nextState = {
        ...state,
        groupsById: Object.fromEntries(
          Object.entries(state.groupsById).map(([groupId, candidate]) => [groupId, { ...candidate, worksheetOrder: [...candidate.worksheetOrder] }]),
        ),
        worksheetsById: Object.fromEntries(
          Object.entries(state.worksheetsById).map(([key, value]) => [key, { ...value }]),
        ),
      };
      removeWorksheetFromAnyGroup(nextState, action.worksheetId);
      return nextState;
    }
    case 'pinWorksheet': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet || worksheet.groupId || worksheet.visibility !== 'Visible') {
        return state;
      }
      return {
        ...state,
        worksheetsById: {
          ...state.worksheetsById,
          [action.worksheetId]: {
            ...worksheet,
            isPinned: true,
            lastKnownStructuralState: { kind: 'pinned' },
          },
        },
      };
    }
    case 'unpinWorksheet': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet) {
        return state;
      }
      return {
        ...state,
        worksheetsById: {
          ...state.worksheetsById,
          [action.worksheetId]: {
            ...worksheet,
            isPinned: false,
            lastKnownStructuralState: { kind: 'ungrouped' },
          },
        },
      };
    }
    case 'markWorksheetUnhidden': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet) {
        return state;
      }
      const nextWorksheet = { ...worksheet, visibility: 'Visible' as const };
      const nextState = {
        ...state,
        worksheetsById: {
          ...state.worksheetsById,
          [action.worksheetId]: nextWorksheet,
        },
      };

      if (nextWorksheet.lastKnownStructuralState?.kind === 'group') {
        const group = nextState.groupsById[nextWorksheet.lastKnownStructuralState.groupId];
        if (group) {
          nextWorksheet.groupId = group.groupId;
          group.worksheetOrder = group.worksheetOrder.includes(nextWorksheet.worksheetId)
            ? group.worksheetOrder
            : [...group.worksheetOrder, nextWorksheet.worksheetId];
          return nextState;
        }
      }

      nextWorksheet.groupId = null;
      nextWorksheet.isPinned = nextWorksheet.lastKnownStructuralState?.kind === 'pinned';
      return nextState;
    }
    case 'renameWorksheetLocally': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet) {
        return state;
      }
      return {
        ...state,
        worksheetsById: {
          ...state.worksheetsById,
          [action.worksheetId]: { ...worksheet, name: action.name },
        },
      };
    }
    default:
      return state;
  }
}

export function createHydratedState(
  snapshot: WorkbookSnapshot,
  persistedModel: PersistedNavigationModel | null,
): NavigationState {
  const baseState = navigationReducer(createDefaultNavigationState(), {
    type: 'hydrateFromWorkbook',
    snapshot,
  });
  return navigationReducer(baseState, { type: 'hydrateFromPersistence', model: persistedModel });
}
