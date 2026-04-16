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
  const liveWorksheetIds = new Set(liveWorksheets.map((worksheet) => worksheet.stableWorksheetId ?? worksheet.worksheetId));
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

  const pinnedWorksheetOrder = dedupeWorksheetIds(model.pinnedWorksheetOrder).filter((worksheetId) => {
    if (!liveWorksheetIds.has(worksheetId)) {
      diagnostics.add('dropped_unknown_pinned_ref');
      return false;
    }

    if (claimedWorksheetIds.has(worksheetId)) {
      diagnostics.add('repaired_duplicate_group_membership');
      return false;
    }

    return true;
  });

  const priorStructuralStateByStableWorksheetId = Object.entries(model.priorStructuralStateByStableWorksheetId).reduce<
    Record<string, StructuralState | null>
  >((accumulator, [worksheetId, structuralState]) => {
    if (!liveWorksheetIds.has(worksheetId)) {
      return accumulator;
    }

    const normalizedState = normalizeStructuralState(structuralState, groupsById);
    if (normalizedState !== structuralState) {
      diagnostics.add('repaired_stale_group_refs');
    }

    accumulator[worksheetId] = normalizedState;
    return accumulator;
  }, {});

  const keptSheetSectionOrder = dedupeWorksheetIds(model.sheetSectionOrder).filter((worksheetId) =>
    liveWorksheetIds.has(worksheetId),
  );
  const missingWorksheetIds = liveWorksheetOrder.filter((worksheetId) => !keptSheetSectionOrder.includes(worksheetId));
  const sheetSectionOrder = [...keptSheetSectionOrder, ...missingWorksheetIds];

  const reconciledModel: PersistedNavigationModel = {
    ...model,
    groups,
    sheetSectionOrder,
    pinnedWorksheetOrder,
    priorStructuralStateByStableWorksheetId,
  };

  const changed = !arraysEqual(model.sheetSectionOrder, reconciledModel.sheetSectionOrder)
    || !arraysEqual(model.pinnedWorksheetOrder, reconciledModel.pinnedWorksheetOrder)
    || !structuralStatesEqual(model.priorStructuralStateByStableWorksheetId, reconciledModel.priorStructuralStateByStableWorksheetId)
    || JSON.stringify(model.groups) !== JSON.stringify(reconciledModel.groups);

  return {
    model: reconciledModel,
    changed,
    diagnostics: [...diagnostics],
  };
}

export function normalizeNavigationState(state: NavigationState): NavigationState {
  const worksheetsById = Object.fromEntries(
    Object.entries(state.worksheetsById).map(([worksheetId, worksheet]) => [
      worksheetId,
      {
        ...worksheet,
        stableWorksheetId: worksheet.stableWorksheetId ?? worksheet.worksheetId,
        nativeWorksheetId: worksheet.nativeWorksheetId ?? worksheet.worksheetId,
      },
    ]),
  ) as Record<string, WorksheetEntity>;

  const normalizedState: NavigationState = {
    ...state,
    worksheetsById,
    groupsById: Object.fromEntries(
      Object.entries(state.groupsById).map(([groupId, group]) => [groupId, cloneGroup(group)]),
    ),
    groupOrder: [...state.groupOrder],
    sheetSectionOrder: [...state.sheetSectionOrder],
    pinnedWorksheetOrder: [...state.pinnedWorksheetOrder],
  };

  const worksheetIds = new Set(Object.keys(normalizedState.worksheetsById));
  const claimedWorksheetIds = new Set<string>();

  normalizedState.groupOrder = normalizedState.groupOrder.filter((groupId) => Boolean(normalizedState.groupsById[groupId]));

  for (const groupId of normalizedState.groupOrder) {
    const group = normalizedState.groupsById[groupId];
    group.worksheetOrder = dedupeWorksheetIds(group.worksheetOrder).filter((worksheetId) => {
      if (!worksheetIds.has(worksheetId)) {
        return false;
      }

      if (claimedWorksheetIds.has(worksheetId)) {
        return false;
      }

      claimedWorksheetIds.add(worksheetId);
      return true;
    });
  }

  normalizedState.pinnedWorksheetOrder = dedupeWorksheetIds(normalizedState.pinnedWorksheetOrder).filter((worksheetId) =>
    worksheetIds.has(worksheetId) && !claimedWorksheetIds.has(worksheetId),
  );

  for (const worksheet of Object.values(normalizedState.worksheetsById)) {
    worksheet.groupId = null;
    worksheet.isPinned = false;
    worksheet.stableWorksheetId = getStableWorksheetId(worksheet);
    worksheet.nativeWorksheetId = worksheet.nativeWorksheetId ?? worksheet.worksheetId;
  }

  for (const groupId of normalizedState.groupOrder) {
    const group = normalizedState.groupsById[groupId];
    for (const worksheetId of group.worksheetOrder) {
      const worksheet = normalizedState.worksheetsById[worksheetId];
      if (!worksheet) {
        continue;
      }

      worksheet.groupId = groupId;
      worksheet.isPinned = false;
      worksheet.lastKnownStructuralState = { kind: 'group', groupId };
    }
  }

  for (const worksheetId of normalizedState.pinnedWorksheetOrder) {
    const worksheet = normalizedState.worksheetsById[worksheetId];
    if (!worksheet || worksheet.groupId) {
      continue;
    }

    worksheet.isPinned = true;
    worksheet.lastKnownStructuralState = { kind: 'pinned' };
  }

  return normalizedState;
}
