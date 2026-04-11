import type { NavigatorView, WorksheetEntity } from '../../../domain/navigation/types';

export type WorksheetContainerId = 'sheets' | `group:${string}`;

export type WorksheetDropKind = 'row' | 'container-end' | 'group-header';

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
  if (containerId === 'sheets') {
    return layout.sheets;
  }

  const groupId = parseGroupIdFromContainerId(containerId);
  return groupId ? layout.groups[groupId] ?? [] : [];
}

function setWorksheetIdsForContainer(
  layout: WorksheetDragLayout,
  containerId: WorksheetContainerId,
  worksheetIds: string[],
): WorksheetDragLayout {
  if (containerId === 'sheets') {
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
  const destinationWorksheetIds = getWorksheetIdsForContainer(nextLayout, destination.containerId).filter(
    (candidateId) => candidateId !== worksheetId,
  );

  const clampedIndex = Math.max(0, Math.min(destination.index, destinationWorksheetIds.length));
  const nextDestinationWorksheetIds = [...destinationWorksheetIds];
  nextDestinationWorksheetIds.splice(clampedIndex, 0, worksheetId);

  nextLayout = setWorksheetIdsForContainer(nextLayout, destination.containerId, nextDestinationWorksheetIds);
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

  if (initialLocation.containerId === 'sheets' && finalLocation.containerId === 'sheets') {
    return {
      kind: 'reorder-sheet-section',
      worksheetId,
      targetIndex: normalizedTargetIndex,
    };
  }

  if (initialLocation.containerId !== 'sheets' && finalLocation.containerId === initialLocation.containerId) {
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

  if (finalLocation.containerId === 'sheets') {
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
