import type { WorksheetEntity } from '../../../domain/navigation/types';
import {
  isSheetContainer,
  parseGroupIdFromContainerId,
  type WorksheetContainerId,
  type WorksheetDragCommit,
  type WorksheetInitialLocation,
} from './worksheetDndModel';

/**
 * Policy that determines if drag operations are allowed.
 * Policies are pure functions that make the business rules explicit and testable.
 */
export interface DnDPolicy {
  /**
   * Determines if a worksheet can be dragged from a container.
   */
  canDrag(
    worksheet: WorksheetEntity,
    fromContainer: WorksheetContainerId,
    state: PolicyEvaluationState,
  ): boolean;

  /**
   * Determines if a worksheet can be dropped into a container.
   */
  canDrop(
    worksheet: WorksheetEntity,
    fromContainer: WorksheetContainerId,
    toContainer: WorksheetContainerId,
    state: PolicyEvaluationState,
  ): boolean;
}

/**
 * State required for policy evaluation.
 */
export interface PolicyEvaluationState {
  worksheetsById: Record<string, WorksheetEntity>;
}

/**
 * Creates a policy evaluation state from the current worksheets.
 */
export function createPolicyState(
  worksheetsById: Record<string, WorksheetEntity>,
): PolicyEvaluationState {
  return { worksheetsById };
}

/**
 * Normalizes the target index when moving within the same container.
 * When dragging downward in the same container, the index needs adjustment
 * because the item is removed first, shifting indices.
 */
function normalizeTargetIndex(
  initialLocation: WorksheetInitialLocation,
  finalLocation: WorksheetInitialLocation,
): number {
  if (initialLocation.containerId !== finalLocation.containerId) {
    return finalLocation.index;
  }

  if (finalLocation.index > initialLocation.index) {
    return finalLocation.index - 1;
  }

  return finalLocation.index;
}

/**
 * Default policy that allows all valid drag operations between sheets and groups.
 */
export const defaultDnDPolicy: DnDPolicy = {
  canDrag: () => true,
  canDrop: () => true,
};

/**
 * Policy for the pinned section that restricts pinned worksheets to only
 * be reordered within the pinned section. Pinned worksheets cannot be moved
 * to other sections, and worksheets from other sections cannot be moved to pinned.
 */
export const pinnedSectionPolicy: DnDPolicy = {
  canDrag: (worksheet, fromContainer) => {
    // Pinned worksheets can be dragged (but only within pinned - see canDrop)
    if (fromContainer === 'pinned') {
      return worksheet.isPinned;
    }
    return true;
  },

  canDrop: (worksheet, fromContainer, toContainer) => {
    // If dragging from pinned, only allow dropping in pinned
    if (fromContainer === 'pinned') {
      return toContainer === 'pinned';
    }

    // If dropping into pinned, only allow if already in pinned (reordering)
    if (toContainer === 'pinned') {
      return false;
    }

    // All other combinations are allowed
    return true;
  },
};

/**
 * Builds a drag commit based on the initial and final locations.
 * Respects the provided policy to enforce business rules.
 *
 * @returns A WorksheetDragCommit if the operation is valid, null otherwise
 */
export function buildDragCommitWithPolicy(
  worksheetId: string,
  initialLocation: WorksheetInitialLocation,
  finalLocation: WorksheetInitialLocation,
  policy: DnDPolicy,
  policyState: PolicyEvaluationState,
): WorksheetDragCommit | null {
  const worksheet = policyState.worksheetsById[worksheetId];
  if (!worksheet) {
    return null;
  }

  // Check if drag is allowed by policy
  if (!policy.canDrag(worksheet, initialLocation.containerId, policyState)) {
    return null;
  }

  // Check if drop is allowed by policy
  if (
    !policy.canDrop(worksheet, initialLocation.containerId, finalLocation.containerId, policyState)
  ) {
    return null;
  }

  const normalizedTargetIndex = normalizeTargetIndex(initialLocation, finalLocation);

  // No-op: same position
  if (
    initialLocation.containerId === finalLocation.containerId &&
    initialLocation.index === normalizedTargetIndex
  ) {
    return null;
  }

  // Reorder within sheets section
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

  // Reorder within pinned section
  if (initialLocation.containerId === 'pinned' && finalLocation.containerId === 'pinned') {
    return {
      kind: 'reorder-pinned',
      worksheetId,
      targetIndex: normalizedTargetIndex,
    };
  }

  // Reorder within the same group
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

  // Move from group to sheets
  if (isSheetContainer(finalLocation.containerId)) {
    return {
      kind: 'remove-from-group',
      worksheetId,
      targetIndex: finalLocation.index,
    };
  }

  // Move to a group (either from sheets or from another group)
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

/**
 * Composes multiple policies into a single policy.
 * All policies must allow the operation for it to be permitted.
 */
export function composePolicies(...policies: DnDPolicy[]): DnDPolicy {
  return {
    canDrag: (worksheet, fromContainer, state) =>
      policies.every((policy) => policy.canDrag(worksheet, fromContainer, state)),
    canDrop: (worksheet, fromContainer, toContainer, state) =>
      policies.every((policy) => policy.canDrop(worksheet, fromContainer, toContainer, state)),
  };
}
