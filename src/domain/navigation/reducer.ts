import { createDefaultNavigationState } from './defaultState';
import { groupColorTokens } from './constants';
import { applyMoveAmongUngroupedVisibleSheets } from './sheetSectionVisibleOrder';
import {
  byWorkbookOrder,
  dedupeWorksheetIds,
  moveWorksheetId,
  reconcileSheetSectionOrder,
} from './utils';
import type {
  GroupColorToken,
  GroupEntity,
  NavigationState,
  PersistedNavigationModel,
  WorkbookSnapshot,
  WorksheetEntity,
} from './types';
import { normalizeNavigationState } from './reconciliation';

export type NavigationAction =
  | { type: 'hydrateFromWorkbook'; snapshot: WorkbookSnapshot }
  | { type: 'hydrateFromPersistence'; model: PersistedNavigationModel | null }
  | { type: 'setActiveWorksheetLocally'; worksheetId: string }
  | { type: 'setQuery'; query: string }
  | { type: 'toggleGroupCollapsed'; groupId: string }
  | { type: 'setGroupCollapsed'; groupId: string; isCollapsed: boolean }
  | { type: 'toggleHiddenSection' }
  | { type: 'createGroup'; name: string; colorToken: GroupColorToken; initialWorksheetId?: string }
  | { type: 'renameGroup'; groupId: string; name: string }
  | { type: 'deleteGroup'; groupId: string }
  | { type: 'restoreGroup'; group: GroupEntity; worksheetId: string; orderIndex: number }
  | { type: 'setGroupColor'; groupId: string; colorToken: GroupColorToken }
  | { type: 'assignWorksheetToGroup'; worksheetId: string; groupId: string; targetIndex?: number }
  | { type: 'removeWorksheetFromGroup'; worksheetId: string; targetIndex?: number }
  | { type: 'reorderGroupWorksheet'; worksheetId: string; groupId: string; targetIndex: number }
  | { type: 'reorderSheetSectionWorksheet'; worksheetId: string; targetIndex: number }
  | { type: 'reorderPinnedWorksheet'; worksheetId: string; targetIndex: number }
  | { type: 'pinWorksheet'; worksheetId: string }
  | { type: 'unpinWorksheet'; worksheetId: string }
  | { type: 'markWorksheetUnhidden'; worksheetId: string }
  | { type: 'markWorksheetHidden'; worksheetId: string }
  | { type: 'renameWorksheetLocally'; worksheetId: string; name: string }
  | { type: 'deleteWorksheet'; worksheetId: string };

function nextGroupColor(index: number): GroupColorToken {
  return groupColorTokens[index % groupColorTokens.length];
}

function toWorksheetEntity(
  snapshotWorksheet: WorkbookSnapshot['worksheets'][number],
  existing: WorksheetEntity | undefined,
): WorksheetEntity {
  const stableWorksheetId = snapshotWorksheet.stableWorksheetId ?? snapshotWorksheet.worksheetId;
  const nativeWorksheetId = snapshotWorksheet.nativeWorksheetId ?? snapshotWorksheet.worksheetId;

  return {
    worksheetId: stableWorksheetId,
    stableWorksheetId,
    nativeWorksheetId,
    name: snapshotWorksheet.name,
    visibility: snapshotWorksheet.visibility,
    workbookOrder: snapshotWorksheet.workbookOrder,
    isPinned: existing?.isPinned ?? false,
    groupId: existing?.groupId ?? null,
    lastKnownStructuralState: existing?.lastKnownStructuralState ?? null,
  };
}

function applyPinnedState(state: NavigationState, pinnedWorksheetOrder: string[]) {
  const pinnedWorksheetIds = dedupeWorksheetIds(pinnedWorksheetOrder);
  Object.values(state.worksheetsById).forEach((worksheet) => {
    worksheet.isPinned = pinnedWorksheetIds.includes(worksheet.worksheetId) && worksheet.groupId === null;
    if (worksheet.isPinned) {
      worksheet.lastKnownStructuralState = { kind: 'pinned' };
    }
  });

  state.pinnedWorksheetOrder = [...pinnedWorksheetIds];
}

function applyPersistence(state: NavigationState, model: PersistedNavigationModel | null) {
  if (!model) {
    state.sheetSectionOrder = reconcileSheetSectionOrder(state.sheetSectionOrder, state.worksheetsById);
    return normalizeNavigationState(state);
  }

  state.groupsById = model.groups.reduce<Record<string, GroupEntity>>((accumulator, group) => {
    accumulator[group.groupId] = group;
    return accumulator;
  }, {});
  state.groupOrder = model.groups.map((group) => group.groupId);
  state.sheetSectionOrder = reconcileSheetSectionOrder(model.sheetSectionOrder ?? [], state.worksheetsById);
  state.hiddenSectionCollapsed = model.hiddenSectionCollapsed;
  state.identityMode = model.identityMode;

  Object.values(state.worksheetsById).forEach((worksheet) => {
    worksheet.lastKnownStructuralState = model.priorStructuralStateByStableWorksheetId[worksheet.worksheetId] ?? null;
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

  applyPinnedState(state, model.pinnedWorksheetOrder);
  return normalizeNavigationState(state);
}

function cloneState(state: NavigationState): NavigationState {
  return {
    ...state,
    groupsById: Object.fromEntries(
      Object.entries(state.groupsById).map(([groupId, candidate]) => [
        groupId,
        { ...candidate, worksheetOrder: [...candidate.worksheetOrder] },
      ]),
    ),
    groupOrder: [...state.groupOrder],
    sheetSectionOrder: [...state.sheetSectionOrder],
    pinnedWorksheetOrder: [...state.pinnedWorksheetOrder],
    worksheetsById: Object.fromEntries(
      Object.entries(state.worksheetsById).map(([key, value]) => [key, { ...value }]),
    ),
  };
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

  const emptyGroupIds = state.groupOrder.filter((groupId) => {
    const candidate = state.groupsById[groupId];
    return candidate ? candidate.worksheetOrder.length === 0 : false;
  });

  if (emptyGroupIds.length === 0) {
    return;
  }

  const emptyGroupIdSet = new Set(emptyGroupIds);
  emptyGroupIds.forEach((groupId) => {
    delete state.groupsById[groupId];
  });
  state.groupOrder = state.groupOrder.filter((groupId) => !emptyGroupIdSet.has(groupId));
}

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'hydrateFromWorkbook': {
      const nextWorksheetsById = action.snapshot.worksheets.reduce<Record<string, WorksheetEntity>>((accumulator, worksheet) => {
        const nextWorksheet = toWorksheetEntity(
          worksheet,
          state.worksheetsById[worksheet.stableWorksheetId ?? worksheet.worksheetId],
        );
        accumulator[nextWorksheet.worksheetId] = nextWorksheet;
        return accumulator;
      }, {});

      return normalizeNavigationState({
        ...state,
        worksheetsById: nextWorksheetsById,
        sheetSectionOrder: reconcileSheetSectionOrder(state.sheetSectionOrder, nextWorksheetsById),
        activeWorksheetId: action.snapshot.activeWorksheetId,
        lastSyncAt: Date.now(),
        isReady: true,
        identityMode: action.snapshot.identityMode ?? state.identityMode,
      });
    }
    case 'hydrateFromPersistence': {
      const draft = cloneState(state);
      return applyPersistence(draft, action.model);
    }
    case 'setActiveWorksheetLocally':
      if (state.activeWorksheetId === action.worksheetId) {
        return state;
      }

      return {
        ...state,
        activeWorksheetId: action.worksheetId,
      };
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
    case 'setGroupCollapsed': {
      const group = state.groupsById[action.groupId];
      if (!group || group.isCollapsed === action.isCollapsed) {
        return state;
      }

      return {
        ...state,
        groupsById: {
          ...state.groupsById,
          [action.groupId]: { ...group, isCollapsed: action.isCollapsed },
        },
      };
    }
    case 'toggleHiddenSection':
      return { ...state, hiddenSectionCollapsed: !state.hiddenSectionCollapsed };
    case 'createGroup': {
      const groupId = `group-${Date.now()}`;
      const initialWorksheet = action.initialWorksheetId
        ? state.worksheetsById[action.initialWorksheetId]
        : null;
      const nextState = cloneState(state);
      const group: GroupEntity = {
        groupId,
        name: action.name.trim(),
        colorToken: action.colorToken ?? nextGroupColor(state.groupOrder.length),
        isCollapsed: true,
        worksheetOrder: initialWorksheet && initialWorksheet.visibility === 'Visible'
          ? [initialWorksheet.worksheetId]
          : [],
        createdAt: Date.now(),
      };

      if (initialWorksheet && initialWorksheet.visibility === 'Visible') {
        removeWorksheetFromAnyGroup(nextState, initialWorksheet.worksheetId);
        nextState.worksheetsById[initialWorksheet.worksheetId] = {
          ...nextState.worksheetsById[initialWorksheet.worksheetId],
          isPinned: false,
          groupId,
          lastKnownStructuralState: { kind: 'group', groupId },
        };
      }

      return {
        ...nextState,
        groupsById: { ...nextState.groupsById, [groupId]: group },
        groupOrder: [groupId, ...nextState.groupOrder],
        sheetSectionOrder: reconcileSheetSectionOrder(nextState.sheetSectionOrder, nextState.worksheetsById),
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
      const nextState = cloneState(state);
      delete nextState.groupsById[action.groupId];

      Object.values(nextState.worksheetsById).forEach((worksheet) => {
        if (worksheet.groupId === action.groupId) {
          worksheet.groupId = null;
          worksheet.lastKnownStructuralState = { kind: 'ungrouped' };
        }
      });

      return {
        ...nextState,
        groupOrder: nextState.groupOrder.filter((groupId) => groupId !== action.groupId),
        sheetSectionOrder: reconcileSheetSectionOrder(nextState.sheetSectionOrder, nextState.worksheetsById),
      };
    }
    case 'restoreGroup': {
      if (state.groupsById[action.group.groupId]) {
        return state;
      }

      const nextState = cloneState(state);
      const insertIndex = Math.max(0, Math.min(action.orderIndex, nextState.groupOrder.length));

      nextState.groupsById[action.group.groupId] = {
        ...action.group,
        worksheetOrder: [...action.group.worksheetOrder],
      };
      nextState.groupOrder = [
        ...nextState.groupOrder.slice(0, insertIndex),
        action.group.groupId,
        ...nextState.groupOrder.slice(insertIndex),
      ];

      const worksheet = nextState.worksheetsById[action.worksheetId];
      if (worksheet) {
        removeWorksheetFromAnyGroup(nextState, action.worksheetId);
        worksheet.groupId = action.group.groupId;
        worksheet.isPinned = false;
        worksheet.lastKnownStructuralState = { kind: 'group', groupId: action.group.groupId };
        nextState.groupsById[action.group.groupId].worksheetOrder = [action.worksheetId];
      }

      return {
        ...nextState,
        sheetSectionOrder: reconcileSheetSectionOrder(nextState.sheetSectionOrder, nextState.worksheetsById),
      };
    }
    case 'setGroupColor': {
      const group = state.groupsById[action.groupId];
      if (!group) {
        return state;
      }

      return {
        ...state,
        groupsById: {
          ...state.groupsById,
          [action.groupId]: { ...group, colorToken: action.colorToken },
        },
      };
    }
    case 'assignWorksheetToGroup': {
      const worksheet = state.worksheetsById[action.worksheetId];
      const group = state.groupsById[action.groupId];
      if (!worksheet || !group || worksheet.visibility !== 'Visible' || worksheet.isPinned) {
        return state;
      }

      const nextState = cloneState(state);
      removeWorksheetFromAnyGroup(nextState, action.worksheetId);

      const nextWorksheet = nextState.worksheetsById[action.worksheetId];
      nextWorksheet.isPinned = false;
      nextWorksheet.groupId = action.groupId;
      nextWorksheet.lastKnownStructuralState = { kind: 'group', groupId: action.groupId };

      nextState.groupsById[action.groupId].worksheetOrder = moveWorksheetId(
        nextState.groupsById[action.groupId].worksheetOrder,
        action.worksheetId,
        action.targetIndex ?? nextState.groupsById[action.groupId].worksheetOrder.length,
      );

      return nextState;
    }
    case 'removeWorksheetFromGroup': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet) {
        return state;
      }

      const nextState = cloneState(state);
      removeWorksheetFromAnyGroup(nextState, action.worksheetId);
      nextState.sheetSectionOrder = action.targetIndex === undefined
        ? reconcileSheetSectionOrder(nextState.sheetSectionOrder, nextState.worksheetsById)
        : applyMoveAmongUngroupedVisibleSheets(
            nextState.sheetSectionOrder,
            nextState.worksheetsById,
            action.worksheetId,
            action.targetIndex,
          );
      return nextState;
    }
    case 'reorderGroupWorksheet': {
      const worksheet = state.worksheetsById[action.worksheetId];
      const group = state.groupsById[action.groupId];
      if (!worksheet || !group || worksheet.groupId !== action.groupId) {
        return state;
      }

      return {
        ...state,
        groupsById: {
          ...state.groupsById,
          [action.groupId]: {
            ...group,
            worksheetOrder: moveWorksheetId(group.worksheetOrder, action.worksheetId, action.targetIndex),
          },
        },
      };
    }
    case 'reorderSheetSectionWorksheet': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet || worksheet.groupId || worksheet.isPinned || worksheet.visibility !== 'Visible') {
        return state;
      }

      return {
        ...state,
        sheetSectionOrder: applyMoveAmongUngroupedVisibleSheets(
          state.sheetSectionOrder,
          state.worksheetsById,
          action.worksheetId,
          action.targetIndex,
        ),
      };
    }
    case 'reorderPinnedWorksheet': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet || !worksheet.isPinned) {
        return state;
      }

      const nextState = cloneState(state);
      nextState.pinnedWorksheetOrder = moveWorksheetId(
        nextState.pinnedWorksheetOrder,
        action.worksheetId,
        action.targetIndex,
      );

      return nextState;
    }
    case 'pinWorksheet': {
      const nextState = cloneState(state);
      const worksheet = nextState.worksheetsById[action.worksheetId];
      if (!worksheet || worksheet.visibility !== 'Visible') {
        return state;
      }

      removeWorksheetFromAnyGroup(nextState, action.worksheetId);

      // Add to pinned order if not already present
      if (!nextState.pinnedWorksheetOrder.includes(action.worksheetId)) {
        nextState.pinnedWorksheetOrder.push(action.worksheetId);
      }

      return {
        ...nextState,
        sheetSectionOrder: reconcileSheetSectionOrder(nextState.sheetSectionOrder, nextState.worksheetsById),
        pinnedWorksheetOrder: nextState.pinnedWorksheetOrder,
        worksheetsById: {
          ...nextState.worksheetsById,
          [action.worksheetId]: {
            ...worksheet,
            isPinned: true,
            groupId: null,
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
        sheetSectionOrder: reconcileSheetSectionOrder(state.sheetSectionOrder, state.worksheetsById),
        pinnedWorksheetOrder: state.pinnedWorksheetOrder.filter((id) => id !== action.worksheetId),
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
      const nextWorksheetsById = {
        ...state.worksheetsById,
        [action.worksheetId]: nextWorksheet,
      };
      const nextState = {
        ...state,
        sheetSectionOrder: reconcileSheetSectionOrder(state.sheetSectionOrder, nextWorksheetsById),
        worksheetsById: nextWorksheetsById,
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
    case 'markWorksheetHidden': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet) {
        return state;
      }

      return {
        ...state,
        worksheetsById: {
          ...state.worksheetsById,
          [action.worksheetId]: { ...worksheet, visibility: 'Hidden' },
        },
      };
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
    case 'deleteWorksheet': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet) {
        return state;
      }

      const nextState = cloneState(state);

      // 1. Remove from any group first
      removeWorksheetFromAnyGroup(nextState, action.worksheetId);

      // 2. Clean up from pinned order
      nextState.pinnedWorksheetOrder = nextState.pinnedWorksheetOrder.filter(
        (id) => id !== action.worksheetId,
      );

      // 3. Clean up from sheet section order
      nextState.sheetSectionOrder = nextState.sheetSectionOrder.filter(
        (id) => id !== action.worksheetId,
      );

      // 4. Clean up from all groups (in case any reference remains)
      Object.values(nextState.groupsById).forEach((group) => {
        group.worksheetOrder = group.worksheetOrder.filter(
          (id) => id !== action.worksheetId,
        );
      });

      const emptyGroupIds = nextState.groupOrder.filter((groupId) => {
        const candidate = nextState.groupsById[groupId];
        return candidate ? candidate.worksheetOrder.length === 0 : false;
      });
      if (emptyGroupIds.length > 0) {
        const emptyGroupIdSet = new Set(emptyGroupIds);
        emptyGroupIds.forEach((groupId) => {
          delete nextState.groupsById[groupId];
        });
        nextState.groupOrder = nextState.groupOrder.filter((groupId) => !emptyGroupIdSet.has(groupId));
      }

      // 5. Finally remove from the dictionary
      delete nextState.worksheetsById[action.worksheetId];

      return nextState;
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
