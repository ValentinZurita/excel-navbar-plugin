import { createDefaultNavigationState } from './defaultState';
import { groupColorTokens } from './constants';
import type {
  GroupColorToken,
  GroupEntity,
  NavigationState,
  PersistedNavigationModel,
  WorkbookSnapshot,
  WorksheetEntity,
} from './types';

export type NavigationAction =
  | { type: 'hydrateFromWorkbook'; snapshot: WorkbookSnapshot }
  | { type: 'hydrateFromPersistence'; model: PersistedNavigationModel | null }
  | { type: 'setQuery'; query: string }
  | { type: 'toggleGroupCollapsed'; groupId: string }
  | { type: 'setGroupCollapsed'; groupId: string; isCollapsed: boolean }
  | { type: 'toggleHiddenSection' }
  | { type: 'createGroup'; name: string; colorToken?: GroupColorToken; initialWorksheetId?: string }
  | { type: 'renameGroup'; groupId: string; name: string }
  | { type: 'deleteGroup'; groupId: string }
  | { type: 'assignWorksheetToGroup'; worksheetId: string; groupId: string; targetIndex?: number }
  | { type: 'removeWorksheetFromGroup'; worksheetId: string; targetIndex?: number }
  | { type: 'reorderGroupWorksheet'; worksheetId: string; groupId: string; targetIndex: number }
  | { type: 'reorderSheetSectionWorksheet'; worksheetId: string; targetIndex: number }
  | { type: 'pinWorksheet'; worksheetId: string }
  | { type: 'unpinWorksheet'; worksheetId: string }
  | { type: 'markWorksheetUnhidden'; worksheetId: string }
  | { type: 'markWorksheetHidden'; worksheetId: string }
  | { type: 'renameWorksheetLocally'; worksheetId: string; name: string };

function nextGroupColor(index: number): GroupColorToken {
  return groupColorTokens[index % groupColorTokens.length];
}

function byWorkbookOrder(left: WorksheetEntity, right: WorksheetEntity) {
  return left.workbookOrder - right.workbookOrder;
}

function toWorksheetEntity(
  snapshotWorksheet: WorkbookSnapshot['worksheets'][number],
  existing: WorksheetEntity | undefined,
): WorksheetEntity {
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

function dedupeWorksheetIds(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((worksheetId) => {
    if (seen.has(worksheetId)) {
      return false;
    }

    seen.add(worksheetId);
    return true;
  });
}

function reconcileSheetSectionOrder(
  currentOrder: string[],
  worksheetsById: Record<string, WorksheetEntity>,
) {
  const knownWorksheetIds = new Set(Object.keys(worksheetsById));
  const kept = dedupeWorksheetIds(currentOrder).filter((worksheetId) => knownWorksheetIds.has(worksheetId));
  const missing = Object.values(worksheetsById)
    .sort(byWorkbookOrder)
    .map((worksheet) => worksheet.worksheetId)
    .filter((worksheetId) => !kept.includes(worksheetId));

  return [...kept, ...missing];
}

function moveWorksheetId(order: string[], worksheetId: string, targetIndex: number) {
  const nextOrder = order.filter((candidateId) => candidateId !== worksheetId);
  const clampedIndex = Math.max(0, Math.min(targetIndex, nextOrder.length));
  nextOrder.splice(clampedIndex, 0, worksheetId);
  return nextOrder;
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
    state.sheetSectionOrder = reconcileSheetSectionOrder(state.sheetSectionOrder, state.worksheetsById);
    return state;
  }

  state.groupsById = model.groups.reduce<Record<string, GroupEntity>>((accumulator, group) => {
    accumulator[group.groupId] = group;
    return accumulator;
  }, {});
  state.groupOrder = model.groups.map((group) => group.groupId);
  state.sheetSectionOrder = reconcileSheetSectionOrder(model.sheetSectionOrder ?? [], state.worksheetsById);
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
}

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'hydrateFromWorkbook': {
      const nextWorksheetsById = action.snapshot.worksheets.reduce<Record<string, WorksheetEntity>>((accumulator, worksheet) => {
        accumulator[worksheet.worksheetId] = toWorksheetEntity(worksheet, state.worksheetsById[worksheet.worksheetId]);
        return accumulator;
      }, {});

      return {
        ...state,
        worksheetsById: nextWorksheetsById,
        sheetSectionOrder: reconcileSheetSectionOrder(state.sheetSectionOrder, nextWorksheetsById),
        activeWorksheetId: action.snapshot.activeWorksheetId,
        lastSyncAt: Date.now(),
        isReady: true,
      };
    }
    case 'hydrateFromPersistence': {
      const draft = cloneState(state);
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
      const reconciledSheetSectionOrder = reconcileSheetSectionOrder(nextState.sheetSectionOrder, nextState.worksheetsById);
      nextState.sheetSectionOrder = action.targetIndex === undefined
        ? reconciledSheetSectionOrder
        : moveWorksheetId(
            reconciledSheetSectionOrder,
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
        sheetSectionOrder: moveWorksheetId(
          reconcileSheetSectionOrder(state.sheetSectionOrder, state.worksheetsById),
          action.worksheetId,
          action.targetIndex,
        ),
      };
    }
    case 'pinWorksheet': {
      const worksheet = state.worksheetsById[action.worksheetId];
      if (!worksheet || worksheet.groupId || worksheet.visibility !== 'Visible') {
        return state;
      }
      return {
        ...state,
        sheetSectionOrder: reconcileSheetSectionOrder(state.sheetSectionOrder, state.worksheetsById),
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
        sheetSectionOrder: reconcileSheetSectionOrder(state.sheetSectionOrder, state.worksheetsById),
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
