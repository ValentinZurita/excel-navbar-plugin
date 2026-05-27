import type {
  GroupEntity,
  NavigationState,
  PersistedNavigationModel,
  PersistenceDiagnosticCode,
  StructuralState,
  WorkbookSnapshot,
  WorksheetEntity,
} from './types';
import { byWorkbookOrder, dedupeWorksheetIds, getStableWorksheetId } from './utils';

interface WorksheetMembership {
  groupId: string | null;
  isPinned: boolean;
  lastKnownStructuralState: StructuralState | null;
}

function stringArraysEqual(left: string[], right: string[]) {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function structuralStateEquals(left: StructuralState | null, right: StructuralState | null) {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === 'group' && right.kind === 'group') {
    return left.groupId === right.groupId;
  }
  return true;
}

function cloneGroup(group: GroupEntity): GroupEntity {
  return {
    ...group,
    worksheetOrder: [...group.worksheetOrder],
  };
}

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function structuralStatesEqual(
  left: Record<string, StructuralState | null>,
  right: Record<string, StructuralState | null>,
) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (!arraysEqual(leftKeys, rightKeys)) {
    return false;
  }

  return leftKeys.every((key) => JSON.stringify(left[key]) === JSON.stringify(right[key]));
}

function normalizeStructuralState(
  value: StructuralState | null | undefined,
  groupsById: Record<string, GroupEntity>,
): StructuralState | null {
  if (!value) {
    return null;
  }

  if (value.kind === 'group' && !groupsById[value.groupId]) {
    return null;
  }

  return value;
}

export function reconcilePersistedNavigationModel(
  snapshot: WorkbookSnapshot,
  model: PersistedNavigationModel,
): {
  model: PersistedNavigationModel;
  changed: boolean;
  diagnostics: PersistenceDiagnosticCode[];
} {
  const diagnostics = new Set<PersistenceDiagnosticCode>();
  const liveWorksheets = [...snapshot.worksheets];
  const liveWorksheetIds = new Set(
    liveWorksheets.map((worksheet) => worksheet.stableWorksheetId ?? worksheet.worksheetId),
  );
  const liveWorksheetOrder = liveWorksheets
    .sort(byWorkbookOrder)
    .map((worksheet) => worksheet.stableWorksheetId ?? worksheet.worksheetId);

  const groups: GroupEntity[] = [];
  const groupsById: Record<string, GroupEntity> = {};
  const claimedWorksheetIds = new Set<string>();
  const seenGroupIds = new Set<string>();

  for (const originalGroup of model.groups) {
    if (!originalGroup || seenGroupIds.has(originalGroup.groupId)) {
      continue;
    }

    seenGroupIds.add(originalGroup.groupId);
    const nextGroup = cloneGroup(originalGroup);
    const dedupedOrder = dedupeWorksheetIds(nextGroup.worksheetOrder);
    const filteredOrder = dedupedOrder.filter((worksheetId) => {
      if (!liveWorksheetIds.has(worksheetId)) {
        diagnostics.add('repaired_stale_group_refs');
        return false;
      }

      if (claimedWorksheetIds.has(worksheetId)) {
        diagnostics.add('repaired_duplicate_group_membership');
        return false;
      }

      claimedWorksheetIds.add(worksheetId);
      return true;
    });

    if (!arraysEqual(filteredOrder, nextGroup.worksheetOrder)) {
      diagnostics.add('repaired_stale_group_refs');
    }

    nextGroup.worksheetOrder = filteredOrder;
    groups.push(nextGroup);
    groupsById[nextGroup.groupId] = nextGroup;
  }

  const pinnedWorksheetOrder = dedupeWorksheetIds(model.pinnedWorksheetOrder).filter(
    (worksheetId) => {
      if (!liveWorksheetIds.has(worksheetId)) {
        diagnostics.add('dropped_unknown_pinned_ref');
        return false;
      }

      if (claimedWorksheetIds.has(worksheetId)) {
        diagnostics.add('repaired_duplicate_group_membership');
        return false;
      }

      return true;
    },
  );

  const priorStructuralStateByStableWorksheetId = Object.entries(
    model.priorStructuralStateByStableWorksheetId,
  ).reduce<Record<string, StructuralState | null>>(
    (accumulator, [worksheetId, structuralState]) => {
      if (!liveWorksheetIds.has(worksheetId)) {
        return accumulator;
      }

      const normalizedState = normalizeStructuralState(structuralState, groupsById);
      if (normalizedState !== structuralState) {
        diagnostics.add('repaired_stale_group_refs');
      }

      accumulator[worksheetId] = normalizedState;
      return accumulator;
    },
    {},
  );

  const keptSheetSectionOrder = dedupeWorksheetIds(model.sheetSectionOrder).filter((worksheetId) =>
    liveWorksheetIds.has(worksheetId),
  );
  const missingWorksheetIds = liveWorksheetOrder.filter(
    (worksheetId) => !keptSheetSectionOrder.includes(worksheetId),
  );
  const sheetSectionOrder = [...keptSheetSectionOrder, ...missingWorksheetIds];

  const reconciledModel: PersistedNavigationModel = {
    ...model,
    groups,
    sheetSectionOrder,
    pinnedWorksheetOrder,
    priorStructuralStateByStableWorksheetId,
  };

  const changed =
    !arraysEqual(model.sheetSectionOrder, reconciledModel.sheetSectionOrder) ||
    !arraysEqual(model.pinnedWorksheetOrder, reconciledModel.pinnedWorksheetOrder) ||
    !structuralStatesEqual(
      model.priorStructuralStateByStableWorksheetId,
      reconciledModel.priorStructuralStateByStableWorksheetId,
    ) ||
    JSON.stringify(model.groups) !== JSON.stringify(reconciledModel.groups);

  return {
    model: reconciledModel,
    changed,
    diagnostics: [...diagnostics],
  };
}

export function normalizeNavigationState(state: NavigationState): NavigationState {
  const worksheetIds = new Set(Object.keys(state.worksheetsById));

  // Phase 1: keep only groups that still exist.
  const nextGroupOrder = state.groupOrder.filter((groupId) => Boolean(state.groupsById[groupId]));
  const groupOrderChanged = !stringArraysEqual(nextGroupOrder, state.groupOrder);
  const groupOrder = groupOrderChanged ? nextGroupOrder : state.groupOrder;

  // Phase 2: compute deduped/filtered worksheetOrder per group, and which
  // worksheets are claimed by a group (to keep them out of pinned).
  const claimedWorksheetIds = new Set<string>();
  const groupsById: Record<string, GroupEntity> = {};
  let groupsChanged = Object.keys(state.groupsById).length !== groupOrder.length;

  for (const groupId of groupOrder) {
    const originalGroup = state.groupsById[groupId];
    const filteredOrder = dedupeWorksheetIds(originalGroup.worksheetOrder).filter((worksheetId) => {
      if (!worksheetIds.has(worksheetId) || claimedWorksheetIds.has(worksheetId)) {
        return false;
      }
      claimedWorksheetIds.add(worksheetId);
      return true;
    });

    if (stringArraysEqual(filteredOrder, originalGroup.worksheetOrder)) {
      groupsById[groupId] = originalGroup;
    } else {
      groupsById[groupId] = { ...originalGroup, worksheetOrder: filteredOrder };
      groupsChanged = true;
    }
  }

  // Phase 3: pinned order, filtering live worksheets that aren't already in a group.
  const filteredPinnedOrder = dedupeWorksheetIds(state.pinnedWorksheetOrder).filter(
    (worksheetId) => worksheetIds.has(worksheetId) && !claimedWorksheetIds.has(worksheetId),
  );
  const pinnedChanged = !stringArraysEqual(filteredPinnedOrder, state.pinnedWorksheetOrder);
  const pinnedWorksheetOrder = pinnedChanged ? filteredPinnedOrder : state.pinnedWorksheetOrder;

  // Phase 4: target membership for each worksheet derived from groups + pinned.
  const targetMembershipById = new Map<string, WorksheetMembership>();
  for (const groupId of groupOrder) {
    const group = groupsById[groupId];
    for (const worksheetId of group.worksheetOrder) {
      targetMembershipById.set(worksheetId, {
        groupId,
        isPinned: false,
        lastKnownStructuralState: { kind: 'group', groupId },
      });
    }
  }

  // Phase 5: build worksheetsById, reusing each existing reference when the
  // computed membership matches. This is the key to letting memoized React
  // rows skip work when periodic syncs report no real change.
  const worksheetsById: Record<string, WorksheetEntity> = {};
  let worksheetsChanged = false;

  for (const [worksheetId, worksheet] of Object.entries(state.worksheetsById)) {
    const stableWorksheetId = getStableWorksheetId(worksheet);
    const nativeWorksheetId = worksheet.nativeWorksheetId ?? worksheet.worksheetId;
    const pinnedAssignment = pinnedWorksheetOrder.includes(worksheetId);
    const groupAssignment = targetMembershipById.get(worksheetId);

    let targetGroupId: string | null;
    let targetIsPinned: boolean;
    let targetStructuralState: StructuralState | null;

    if (groupAssignment) {
      targetGroupId = groupAssignment.groupId;
      targetIsPinned = false;
      targetStructuralState = groupAssignment.lastKnownStructuralState;
    } else if (pinnedAssignment) {
      targetGroupId = null;
      targetIsPinned = true;
      targetStructuralState = { kind: 'pinned' };
    } else {
      targetGroupId = null;
      targetIsPinned = false;
      // Preserve any historical structural state (e.g. 'ungrouped' or stale group ref).
      targetStructuralState = worksheet.lastKnownStructuralState;
    }

    if (
      worksheet.stableWorksheetId === stableWorksheetId &&
      worksheet.nativeWorksheetId === nativeWorksheetId &&
      worksheet.groupId === targetGroupId &&
      worksheet.isPinned === targetIsPinned &&
      structuralStateEquals(worksheet.lastKnownStructuralState, targetStructuralState)
    ) {
      worksheetsById[worksheetId] = worksheet;
      continue;
    }

    worksheetsById[worksheetId] = {
      ...worksheet,
      stableWorksheetId,
      nativeWorksheetId,
      groupId: targetGroupId,
      isPinned: targetIsPinned,
      lastKnownStructuralState: targetStructuralState,
    };
    worksheetsChanged = true;
  }

  if (!worksheetsChanged && !groupsChanged && !groupOrderChanged && !pinnedChanged) {
    return state;
  }

  return {
    ...state,
    worksheetsById: worksheetsChanged ? worksheetsById : state.worksheetsById,
    groupsById: groupsChanged ? groupsById : state.groupsById,
    groupOrder,
    pinnedWorksheetOrder,
  };
}
