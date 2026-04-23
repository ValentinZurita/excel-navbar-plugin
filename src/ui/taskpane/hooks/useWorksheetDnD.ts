import {
  KeyboardCode,
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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildDragCommit,
  type WorksheetContainerId,
  type WorksheetDragItemData,
  type WorksheetDropTargetData,
  type WorksheetProjectedDropTarget,
} from '../dnd/worksheetDndModel';
import {
  buildDragCommitWithPolicy,
  type DnDPolicy,
  type PolicyEvaluationState,
} from '../dnd/dndPolicies';


interface UseWorksheetDnDParams {
  assignWorksheetToGroup: (worksheetId: string, groupId: string, targetIndex?: number) => void;
  removeWorksheetFromGroup: (worksheetId: string, targetIndex?: number) => void;
  reorderGroupWorksheet: (worksheetId: string, groupId: string, targetIndex: number) => void;
  reorderSheetSectionWorksheet: (worksheetId: string, targetIndex: number) => void;
  reorderPinnedWorksheet: (worksheetId: string, targetIndex: number) => void;
  /**
   * Optional policy to validate drag operations. When provided, visual feedback
   * will be suppressed for drop targets that violate the policy.
   */
  policy?: DnDPolicy;
  /**
   * Required when policy is provided. Used to evaluate policy conditions.
   */
  policyState?: PolicyEvaluationState;
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

  return null;
}

function areProjectedDropTargetsEqual(
  left: WorksheetProjectedDropTarget | null,
  right: WorksheetProjectedDropTarget | null,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.containerId === right.containerId && left.index === right.index && left.kind === right.kind
  );
}

/**
 * When `DragEndEvent.over` is null, dnd-kit can still fire `onDragEnd` right after
 * a valid `onDragOver`. Reuse only the last policy-approved drop target then.
 * If `over` is non-null but not a worksheet gap target, do not fall back (avoids
 * committing against the wrong droppable).
 */
function resolveDropTargetForDragEnd(
  event: DragEndEvent,
  lastPolicyApprovedTarget: WorksheetProjectedDropTarget | null,
): WorksheetProjectedDropTarget | null {
  const fromPointerCollision = getProjectedDropTarget(event.over?.data.current);
  if (fromPointerCollision) {
    return fromPointerCollision;
  }

  if (!event.over) {
    return lastPolicyApprovedTarget;
  }

  return null;
}

export function useWorksheetDnD({
  assignWorksheetToGroup,
  removeWorksheetFromGroup,
  reorderGroupWorksheet,
  reorderSheetSectionWorksheet,
  reorderPinnedWorksheet,
  policy,
  policyState,
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
      keyboardCodes: {
        // Start drag ONLY with Space. Keep Enter free for worksheet activation.
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space],
      },
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  // UI state drives the current drag preview rendered by the task pane.
  const [activeWorksheetId, setActiveWorksheetId] = useState<string | null>(null);
  const [projectedDropTarget, setProjectedDropTarget] =
    useState<WorksheetProjectedDropTarget | null>(null);
  const [flashedGroupId, setFlashedGroupId] = useState<string | null>(null);

  // Mutable refs keep transient drag bookkeeping out of React's render cycle.
  const initialLocationRef = useRef<{
    worksheetId: string;
    containerId: WorksheetContainerId;
    index: number;
  } | null>(null);
  const lastPolicyApprovedDropTargetRef = useRef<WorksheetProjectedDropTarget | null>(null);
  const flashTimeoutIdRef = useRef<number | null>(null);
  const suppressActivationRef = useRef<{ worksheetId: string | null; until: number }>({
    worksheetId: null,
    until: 0,
  });

  const clearFlashTimeout = useCallback(() => {
    if (flashTimeoutIdRef.current !== null) {
      window.clearTimeout(flashTimeoutIdRef.current);
      flashTimeoutIdRef.current = null;
    }
  }, []);

  const updateProjectedDropTarget = useCallback(
    (nextProjectedDropTarget: WorksheetProjectedDropTarget | null) => {
      setProjectedDropTarget((currentProjectedDropTarget) =>
        areProjectedDropTargetsEqual(currentProjectedDropTarget, nextProjectedDropTarget)
          ? currentProjectedDropTarget
          : nextProjectedDropTarget,
      );
    },
    [],
  );

  const resetDragState = useCallback(() => {
    setActiveWorksheetId(null);
    updateProjectedDropTarget(null);
    initialLocationRef.current = null;
    lastPolicyApprovedDropTargetRef.current = null;
  }, [updateProjectedDropTarget]);

  // Drag start captures the source location and seeds the initial preview state.
  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeData = event.active.data.current;
      if (!isWorksheetDragItemData(activeData)) {
        return;
      }

      setActiveWorksheetId(activeData.worksheetId);
      const initialDropPreview: WorksheetProjectedDropTarget = {
        containerId: activeData.containerId,
        index: activeData.index,
        kind: 'gap',
      };
      lastPolicyApprovedDropTargetRef.current = initialDropPreview;
      updateProjectedDropTarget(initialDropPreview);
      initialLocationRef.current = {
        worksheetId: activeData.worksheetId,
        containerId: activeData.containerId,
        index: activeData.index,
      };
    },
    [updateProjectedDropTarget],
  );

  // Drag over is preview-only: it updates the highlighted drop target without committing.
  // Validates against policy before showing visual feedback to prevent misleading UX.
  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const nextProjectedDropTarget = getProjectedDropTarget(event.over?.data.current);
      const initialLocation = initialLocationRef.current;

      if (!nextProjectedDropTarget) {
        lastPolicyApprovedDropTargetRef.current = null;
        updateProjectedDropTarget(null);
        return;
      }

      // Validate against policy if provided to suppress invalid drop targets visually
      if (policy && policyState && initialLocation) {
        const worksheet = policyState.worksheetsById[initialLocation.worksheetId];
        if (!worksheet) {
          lastPolicyApprovedDropTargetRef.current = null;
          updateProjectedDropTarget(null);
          return;
        }

        const isDropAllowed = policy.canDrop(
          worksheet,
          initialLocation.containerId,
          nextProjectedDropTarget.containerId,
          policyState,
        );

        if (!isDropAllowed) {
          lastPolicyApprovedDropTargetRef.current = null;
          updateProjectedDropTarget(null);
          return;
        }
      }

      lastPolicyApprovedDropTargetRef.current = nextProjectedDropTarget;
      updateProjectedDropTarget(nextProjectedDropTarget);
    },
    [policy, policyState, updateProjectedDropTarget],
  );

  // Group flashes are time-based UI affordances, so they need explicit cleanup on unmount.
  useEffect(() => {
    return () => {
      clearFlashTimeout();
    };
  }, [clearFlashTimeout]);

  const flashAssignedGroup = useCallback(
    (groupId: string) => {
      clearFlashTimeout();
      setFlashedGroupId(groupId);
      flashTimeoutIdRef.current = window.setTimeout(() => {
        setFlashedGroupId((currentGroupId) => (currentGroupId === groupId ? null : currentGroupId));
        flashTimeoutIdRef.current = null;
      }, 260);
    },
    [clearFlashTimeout],
  );

  const onDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      resetDragState();
    },
    [resetDragState],
  );

  // Drag end resolves the authoritative drop target from the event payload and commits once.
  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeData = event.active.data.current;
      const initialLocation = initialLocationRef.current;

      if (!isWorksheetDragItemData(activeData) || !initialLocation) {
        resetDragState();
        return;
      }

      const finalDropTarget = resolveDropTargetForDragEnd(
        event,
        lastPolicyApprovedDropTargetRef.current,
      );
      const finalLocation = finalDropTarget
        ? {
            containerId: finalDropTarget.containerId,
            index: finalDropTarget.index,
          }
        : null;

      if (!finalLocation) {
        resetDragState();
        return;
      }

      const commit =
        policy && policyState
          ? buildDragCommitWithPolicy(
              activeData.worksheetId,
              initialLocation,
              finalLocation,
              policy,
              policyState,
            )
          : buildDragCommit(activeData.worksheetId, initialLocation, finalLocation);

      if (commit) {
        switch (commit.kind) {
          case 'reorder-sheet-section':
            reorderSheetSectionWorksheet(commit.worksheetId, commit.targetIndex);
            break;
          case 'reorder-pinned':
            reorderPinnedWorksheet(commit.worksheetId, commit.targetIndex);
            break;
          case 'reorder-group':
            reorderGroupWorksheet(commit.worksheetId, commit.groupId, commit.targetIndex);
            break;
          case 'assign-to-group':
            assignWorksheetToGroup(commit.worksheetId, commit.groupId, commit.targetIndex);
            flashAssignedGroup(commit.groupId);
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
    },
    [
      assignWorksheetToGroup,
      flashAssignedGroup,
      removeWorksheetFromGroup,
      reorderGroupWorksheet,
      reorderPinnedWorksheet,
      reorderSheetSectionWorksheet,
      resetDragState,
      policy,
      policyState,
    ],
  );

  const shouldSuppressActivation = useCallback((worksheetId: string) => {
    const { worksheetId: suppressedWorksheetId, until } = suppressActivationRef.current;
    return suppressedWorksheetId === worksheetId && Date.now() < until;
  }, []);

  return {
    sensors,
    activeWorksheetId,
    projectedDropTarget,
    flashedGroupId,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    shouldSuppressActivation,
  };
}
