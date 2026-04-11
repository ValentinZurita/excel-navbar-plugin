import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { NavigatorView, WorksheetEntity } from '../../../domain/navigation/types';
import {
  buildDragCommit,
  buildWorksheetDragLayout,
  findWorksheetLocation,
  getWorksheetEntitiesForContainer,
  moveWorksheetInLayout,
  parseGroupIdFromContainerId,
  type WorksheetContainerId,
  type WorksheetDragItemData,
  type WorksheetDragLayout,
  type WorksheetDropTargetData,
  type WorksheetProjectedDropTarget,
} from '../dnd/worksheetDndModel';

interface UseWorksheetDnDParams {
  navigatorView: NavigatorView;
  worksheetsById: Record<string, WorksheetEntity>;
  assignWorksheetToGroup: (worksheetId: string, groupId: string, targetIndex?: number) => void;
  removeWorksheetFromGroup: (worksheetId: string, targetIndex?: number) => void;
  reorderGroupWorksheet: (worksheetId: string, groupId: string, targetIndex: number) => void;
  reorderSheetSectionWorksheet: (worksheetId: string, targetIndex: number) => void;
  setGroupCollapsed: (groupId: string, isCollapsed: boolean) => void;
}

function isWorksheetDragItemData(data: unknown): data is WorksheetDragItemData {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'type' in data &&
      'worksheetId' in data &&
      'containerId' in data &&
      'index' in data &&
      (data as WorksheetDragItemData).type === 'worksheet',
  );
}

function isWorksheetDropTargetData(data: unknown): data is WorksheetDropTargetData {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'type' in data &&
      'containerId' in data &&
      'index' in data &&
      'kind' in data &&
      (data as WorksheetDropTargetData).type === 'worksheet-drop-target',
  );
}

function getProjectedDropTarget(data: unknown): WorksheetProjectedDropTarget | null {
  if (isWorksheetDropTargetData(data)) {
    return {
      containerId: data.containerId,
      index: data.index,
      kind: data.kind,
    };
  }

  if (isWorksheetDragItemData(data)) {
    return {
      containerId: data.containerId,
      index: data.index,
      kind: 'row',
    };
  }

  return null;
}

export function useWorksheetDnD({
  navigatorView,
  worksheetsById,
  assignWorksheetToGroup,
  removeWorksheetFromGroup,
  reorderGroupWorksheet,
  reorderSheetSectionWorksheet,
  setGroupCollapsed,
}: UseWorksheetDnDParams) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [activeWorksheetId, setActiveWorksheetId] = useState<string | null>(null);
  const [dragLayout, setDragLayout] = useState<WorksheetDragLayout | null>(null);
  const [projectedDropTarget, setProjectedDropTarget] = useState<WorksheetProjectedDropTarget | null>(null);
  const initialLocationRef = useRef<{ worksheetId: string; containerId: WorksheetContainerId; index: number } | null>(null);
  const hoverOpenTimeoutIdRef = useRef<number | null>(null);
  const pendingHoverGroupIdRef = useRef<string | null>(null);
  const suppressActivationRef = useRef<{ worksheetId: string | null; until: number }>({ worksheetId: null, until: 0 });

  const groupsById = useMemo(
    () =>
      navigatorView.groups.reduce<Record<string, NavigatorView['groups'][number]>>((accumulator, group) => {
        accumulator[group.groupId] = group;
        return accumulator;
      }, {}),
    [navigatorView.groups],
  );

  const clearHoverOpenTimer = useCallback(() => {
    if (hoverOpenTimeoutIdRef.current !== null) {
      window.clearTimeout(hoverOpenTimeoutIdRef.current);
      hoverOpenTimeoutIdRef.current = null;
    }

    pendingHoverGroupIdRef.current = null;
  }, []);

  const scheduleGroupOpen = useCallback((containerId: WorksheetContainerId) => {
    const groupId = parseGroupIdFromContainerId(containerId);
    if (!groupId) {
      clearHoverOpenTimer();
      return;
    }

    const group = groupsById[groupId];
    if (!group?.isCollapsed) {
      clearHoverOpenTimer();
      return;
    }

    if (pendingHoverGroupIdRef.current === groupId) {
      return;
    }

    clearHoverOpenTimer();
    pendingHoverGroupIdRef.current = groupId;
    hoverOpenTimeoutIdRef.current = window.setTimeout(() => {
      setGroupCollapsed(groupId, false);
      hoverOpenTimeoutIdRef.current = null;
      pendingHoverGroupIdRef.current = null;
    }, 180);
  }, [clearHoverOpenTimer, groupsById, setGroupCollapsed]);

  const resetDragState = useCallback(() => {
    clearHoverOpenTimer();
    setActiveWorksheetId(null);
    setDragLayout(null);
    setProjectedDropTarget(null);
    initialLocationRef.current = null;
  }, [clearHoverOpenTimer]);

  const onDragStart = useCallback((event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (!isWorksheetDragItemData(activeData)) {
      return;
    }

    setActiveWorksheetId(activeData.worksheetId);
    setDragLayout(buildWorksheetDragLayout(navigatorView));
    setProjectedDropTarget({
      containerId: activeData.containerId,
      index: activeData.index,
      kind: 'row',
    });
    initialLocationRef.current = {
      worksheetId: activeData.worksheetId,
      containerId: activeData.containerId,
      index: activeData.index,
    };
  }, [navigatorView]);

  const onDragOver = useCallback((event: DragOverEvent) => {
    const activeData = event.active.data.current;
    const nextProjectedDropTarget = getProjectedDropTarget(event.over?.data.current);

    if (!isWorksheetDragItemData(activeData) || !nextProjectedDropTarget) {
      clearHoverOpenTimer();
      return;
    }

    scheduleGroupOpen(nextProjectedDropTarget.containerId);
    setProjectedDropTarget(nextProjectedDropTarget);
    setDragLayout((currentLayout) => {
      const baseLayout = currentLayout ?? buildWorksheetDragLayout(navigatorView);
      return moveWorksheetInLayout(baseLayout, activeData.worksheetId, nextProjectedDropTarget);
    });
  }, [clearHoverOpenTimer, navigatorView, scheduleGroupOpen]);

  const onDragCancel = useCallback((_event: DragCancelEvent) => {
    resetDragState();
  }, [resetDragState]);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const activeData = event.active.data.current;
    const initialLocation = initialLocationRef.current;

    if (!isWorksheetDragItemData(activeData) || !initialLocation || !event.over) {
      resetDragState();
      return;
    }

    const finalLayout = dragLayout ?? buildWorksheetDragLayout(navigatorView);
    const finalLocation = findWorksheetLocation(finalLayout, activeData.worksheetId);

    if (!finalLocation) {
      resetDragState();
      return;
    }

    const commit = buildDragCommit(activeData.worksheetId, initialLocation, finalLocation);

    if (commit) {
      switch (commit.kind) {
        case 'reorder-sheet-section':
          reorderSheetSectionWorksheet(commit.worksheetId, commit.targetIndex);
          break;
        case 'reorder-group':
          reorderGroupWorksheet(commit.worksheetId, commit.groupId, commit.targetIndex);
          break;
        case 'assign-to-group':
          assignWorksheetToGroup(commit.worksheetId, commit.groupId, commit.targetIndex);
          break;
        case 'remove-from-group':
          removeWorksheetFromGroup(commit.worksheetId, commit.targetIndex);
          break;
      }
    }

    suppressActivationRef.current = {
      worksheetId: activeData.worksheetId,
      until: Date.now() + 250,
    };

    resetDragState();
  }, [
    assignWorksheetToGroup,
    dragLayout,
    navigatorView,
    removeWorksheetFromGroup,
    reorderGroupWorksheet,
    reorderSheetSectionWorksheet,
    resetDragState,
  ]);

  const shouldSuppressActivation = useCallback((worksheetId: string) => {
    const { worksheetId: suppressedWorksheetId, until } = suppressActivationRef.current;
    return suppressedWorksheetId === worksheetId && Date.now() < until;
  }, []);

  const getContainerWorksheets = useCallback((containerId: WorksheetContainerId, fallback: WorksheetEntity[]) => {
    return getWorksheetEntitiesForContainer(dragLayout, containerId, fallback, worksheetsById);
  }, [dragLayout, worksheetsById]);

  return {
    sensors,
    activeWorksheetId,
    activeWorksheet: activeWorksheetId ? worksheetsById[activeWorksheetId] ?? null : null,
    projectedDropTarget,
    dragLayout,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    shouldSuppressActivation,
    getContainerWorksheets,
  };
}
