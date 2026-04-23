import type { NavigatorView, WorksheetEntity } from '../../../domain/navigation/types';

export type WorksheetContainerId = 'sheets' | 'pinned' | `group:${string}`;

export type WorksheetDropKind = 'gap' | 'container-end' | 'group-header';

export interface WorksheetDragItemData {
  type: 'worksheet';
  worksheetId: string;
  containerId: WorksheetContainerId;
  index: number;
}

export interface WorksheetDropTargetData {
  type: 'worksheet-drop-target';
  containerId: WorksheetContainerId;
  index: number;
  kind: WorksheetDropKind;
}

export interface WorksheetDragLayout {
  sheets: string[];
  groups: Record<string, string[]>;
}

export interface WorksheetProjectedDropTarget {
  containerId: WorksheetContainerId;
  index: number;
  kind: WorksheetDropKind;
}

export interface WorksheetInitialLocation {
  containerId: WorksheetContainerId;
  index: number;
}

export type WorksheetDragCommit =
  | { kind: 'reorder-sheet-section'; worksheetId: string; targetIndex: number }
  | { kind: 'reorder-pinned'; worksheetId: string; targetIndex: number }
  | { kind: 'reorder-group'; worksheetId: string; groupId: string; targetIndex: number }
  | { kind: 'assign-to-group'; worksheetId: string; groupId: string; targetIndex: number }
  | { kind: 'remove-from-group'; worksheetId: string; targetIndex: number };

export function toGroupContainerId(groupId: string): WorksheetContainerId {
  return `group:${groupId}`;
}

export function parseGroupIdFromContainerId(containerId: WorksheetContainerId): string | null {
  return containerId.startsWith('group:') ? containerId.slice('group:'.length) : null;
}

export function buildWorksheetDragLayout(navigatorView: NavigatorView): WorksheetDragLayout {
  return {
    sheets: navigatorView.ungrouped.map((worksheet) => worksheet.worksheetId),
    groups: navigatorView.groups.reduce<Record<string, string[]>>((accumulator, group) => {
      accumulator[group.groupId] = group.worksheets.map((worksheet) => worksheet.worksheetId);
      return accumulator;
    }, {}),
  };
}

function clampInsertionIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length));
}

export function isSheetContainer(containerId: WorksheetContainerId) {
  return containerId === 'sheets';
}

export function isPinnedContainer(containerId: WorksheetContainerId) {
  return containerId === 'pinned';
}

export function findWorksheetLocation(
  layout: WorksheetDragLayout,
  worksheetId: string,
): WorksheetInitialLocation | null {
  const sheetIndex = layout.sheets.indexOf(worksheetId);
  if (sheetIndex >= 0) {
    return { containerId: 'sheets', index: sheetIndex };
  }

  for (const [groupId, worksheetIds] of Object.entries(layout.groups)) {
    const groupIndex = worksheetIds.indexOf(worksheetId);
    if (groupIndex >= 0) {
      return {
        containerId: toGroupContainerId(groupId),
        index: groupIndex,
      };
    }
  }

  return null;
}

export function getWorksheetIdsForContainer(
  layout: WorksheetDragLayout,
  containerId: WorksheetContainerId,
): string[] {
  if (isSheetContainer(containerId)) {
    return layout.sheets;
  }

  const groupId = parseGroupIdFromContainerId(containerId);
  return groupId ? (layout.groups[groupId] ?? []) : [];
}

function setWorksheetIdsForContainer(
  layout: WorksheetDragLayout,
  containerId: WorksheetContainerId,
  worksheetIds: string[],
): WorksheetDragLayout {
  if (isSheetContainer(containerId)) {
    return {
      ...layout,
      sheets: worksheetIds,
    };
  }

  const groupId = parseGroupIdFromContainerId(containerId);
  if (!groupId) {
    return layout;
  }

  return {
    ...layout,
    groups: {
      ...layout.groups,
      [groupId]: worksheetIds,
    },
  };
}

export function moveWorksheetInLayout(
  layout: WorksheetDragLayout,
  worksheetId: string,
  destination: WorksheetProjectedDropTarget,
): WorksheetDragLayout {
  const source = findWorksheetLocation(layout, worksheetId);
  if (!source) {
    return layout;
  }

  const sourceWorksheetIds = getWorksheetIdsForContainer(layout, source.containerId).filter(
    (candidateId) => candidateId !== worksheetId,
  );

  let nextLayout = setWorksheetIdsForContainer(layout, source.containerId, sourceWorksheetIds);
  const destinationWorksheetIds = getWorksheetIdsForContainer(
    nextLayout,
    destination.containerId,
  ).filter((candidateId) => candidateId !== worksheetId);

  const clampedIndex = clampInsertionIndex(destination.index, destinationWorksheetIds.length);
  const nextDestinationWorksheetIds = [...destinationWorksheetIds];
  nextDestinationWorksheetIds.splice(clampedIndex, 0, worksheetId);

  nextLayout = setWorksheetIdsForContainer(
    nextLayout,
    destination.containerId,
    nextDestinationWorksheetIds,
  );
  return nextLayout;
}

export function getWorksheetEntitiesForContainer(
  layout: WorksheetDragLayout | null,
  containerId: WorksheetContainerId,
  fallback: WorksheetEntity[],
  worksheetsById: Record<string, WorksheetEntity>,
): WorksheetEntity[] {
  if (!layout) {
    return fallback;
  }

  return getWorksheetIdsForContainer(layout, containerId)
    .map((worksheetId) => worksheetsById[worksheetId])
    .filter((worksheet): worksheet is WorksheetEntity => Boolean(worksheet));
}

function normalizeTargetIndex(
  initialLocation: WorksheetInitialLocation,
  finalLocation: WorksheetInitialLocation,
) {
  if (initialLocation.containerId !== finalLocation.containerId) {
    return finalLocation.index;
  }

  if (finalLocation.index > initialLocation.index) {
    return finalLocation.index - 1;
  }

  return finalLocation.index;
}

/**
 * @deprecated Use buildDragCommitWithPolicy from dndPolicies.ts instead for better policy enforcement
 */
export function buildDragCommit(
  worksheetId: string,
  initialLocation: WorksheetInitialLocation,
  finalLocation: WorksheetInitialLocation,
): WorksheetDragCommit | null {
  const normalizedTargetIndex = normalizeTargetIndex(initialLocation, finalLocation);

  if (
    initialLocation.containerId === finalLocation.containerId &&
    initialLocation.index === normalizedTargetIndex
  ) {
    return null;
  }

  // Reorder within pinned section
  if (initialLocation.containerId === 'pinned' && finalLocation.containerId === 'pinned') {
    return {
      kind: 'reorder-pinned',
      worksheetId,
      targetIndex: normalizedTargetIndex,
    };
  }

  // Prevent moving from pinned to other sections (must use policy for proper enforcement)
  if (initialLocation.containerId === 'pinned' && finalLocation.containerId !== 'pinned') {
    return null;
  }

  // Prevent moving to pinned from other sections (must use policy for proper enforcement)
  if (finalLocation.containerId === 'pinned' && initialLocation.containerId !== 'pinned') {
    return null;
  }

  if (
    isSheetContainer(initialLocation.containerId) &&
    isSheetContainer(finalLocation.containerId)
  ) {
    return {
      kind: 'reorder-sheet-section',
      worksheetId,
      targetIndex: normalizedTargetIndex,
    };
  }

  if (
    !isSheetContainer(initialLocation.containerId) &&
    finalLocation.containerId === initialLocation.containerId
  ) {
    const groupId = parseGroupIdFromContainerId(finalLocation.containerId);
    if (!groupId) {
      return null;
    }

    return {
      kind: 'reorder-group',
      worksheetId,
      groupId,
      targetIndex: normalizedTargetIndex,
    };
  }

  if (isSheetContainer(finalLocation.containerId)) {
    return {
      kind: 'remove-from-group',
      worksheetId,
      targetIndex: finalLocation.index,
    };
  }

  const destinationGroupId = parseGroupIdFromContainerId(finalLocation.containerId);
  if (!destinationGroupId) {
    return null;
  }

  return {
    kind: 'assign-to-group',
    worksheetId,
    groupId: destinationGroupId,
    targetIndex: finalLocation.index,
  };
}
