import type { GroupEntity } from '../../../domain/navigation/types';
import type { UndoToastPayload } from './useUndoToastScheduler';

interface BuildGroupRemovalUndoToastArgs {
  groupId: string | null | undefined;
  worksheetId: string;
  groupsById: Record<string, GroupEntity>;
  groupOrder: string[];
}

/**
 * Builds an undo toast payload only when removing/moving this worksheet will
 * implicitly delete a now-empty group.
 */
export function buildGroupRemovalUndoToast(
  args: BuildGroupRemovalUndoToastArgs,
): UndoToastPayload | null {
  const { groupId, worksheetId, groupsById, groupOrder } = args;
  if (!groupId) {
    return null;
  }

  const group = groupsById[groupId];
  if (!group || group.worksheetOrder.length !== 1) {
    return null;
  }

  const orderIndex = groupOrder.findIndex((candidateId) => candidateId === group.groupId);

  return {
    group: {
      ...group,
      worksheetOrder: [...group.worksheetOrder],
    },
    worksheetId,
    orderIndex: orderIndex >= 0 ? orderIndex : 0,
    message: `Group ${group.name} removed.`,
  };
}
