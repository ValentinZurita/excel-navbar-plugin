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
import { useCallback, useRef, useState } from 'react';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import {
  buildDragCommit,
  type WorksheetContainerId,
  type WorksheetDragItemData,
  type WorksheetDropTargetData,
  type WorksheetProjectedDropTarget,
} from '../dnd/worksheetDndModel';

interface UseWorksheetDnDParams {
  worksheetsById: Record<string, WorksheetEntity>;
  assignWorksheetToGroup: (worksheetId: string, groupId: string, targetIndex?: number) => void;
  removeWorksheetFromGroup: (worksheetId: string, targetIndex?: number) => void;
  reorderGroupWorksheet: (worksheetId: string, groupId: string, targetIndex: number) => void;
  reorderSheetSectionWorksheet: (worksheetId: string, targetIndex: number) => void;
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
  worksheetsById,
  assignWorksheetToGroup,
  removeWorksheetFromGroup,
  reorderGroupWorksheet,
  reorderSheetSectionWorksheet,
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
  const [projectedDropTarget, setProjectedDropTarget] = useState<WorksheetProjectedDropTarget | null>(null);
  const [flashedGroupId, setFlashedGroupId] = useState<string | null>(null);
  const initialLocationRef = useRef<{ worksheetId: string; containerId: WorksheetContainerId; index: number } | null>(null);
  const flashTimeoutIdRef = useRef<number | null>(null);
  const suppressActivationRef = useRef<{ worksheetId: string | null; until: number }>({ worksheetId: null, until: 0 });

  const resetDragState = useCallback(() => {
    setActiveWorksheetId(null);
    setProjectedDropTarget(null);
    initialLocationRef.current = null;
  }, []);

  const onDragStart = useCallback((event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (!isWorksheetDragItemData(activeData)) {
      return;
    }

    setActiveWorksheetId(activeData.worksheetId);
    setProjectedDropTarget(null);
    initialLocationRef.current = {
      worksheetId: activeData.worksheetId,
      containerId: activeData.containerId,
      index: activeData.index,
    };
  }, []);

  const onDragOver = useCallback((event: DragOverEvent) => {
    const nextProjectedDropTarget = getProjectedDropTarget(event.over?.data.current);

    if (!nextProjectedDropTarget) {
      setProjectedDropTarget(null);
      return;
    }

    setProjectedDropTarget(nextProjectedDropTarget);
  }, []);

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

    const finalLocation = projectedDropTarget
      ? {
          containerId: projectedDropTarget.containerId,
          index: projectedDropTarget.index,
        }
      : null;

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
          if (flashTimeoutIdRef.current !== null) {
            window.clearTimeout(flashTimeoutIdRef.current);
          }
          setFlashedGroupId(commit.groupId);
          flashTimeoutIdRef.current = window.setTimeout(() => {
            setFlashedGroupId((currentGroupId) => (currentGroupId === commit.groupId ? null : currentGroupId));
            flashTimeoutIdRef.current = null;
          }, 260);
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
    projectedDropTarget,
    removeWorksheetFromGroup,
    reorderGroupWorksheet,
    reorderSheetSectionWorksheet,
    resetDragState,
  ]);

  const shouldSuppressActivation = useCallback((worksheetId: string) => {
    const { worksheetId: suppressedWorksheetId, until } = suppressActivationRef.current;
    return suppressedWorksheetId === worksheetId && Date.now() < until;
  }, []);

  return {
    sensors,
    activeWorksheetId,
    activeWorksheet: activeWorksheetId ? worksheetsById[activeWorksheetId] ?? null : null,
    projectedDropTarget,
    flashedGroupId,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    shouldSuppressActivation,
  };
}
