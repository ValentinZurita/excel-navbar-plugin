import { describe, expect, it } from 'vitest';
import type { GroupEntity } from '../../src/domain/navigation/types';
import { buildGroupRemovalUndoToast } from '../../src/ui/taskpane/hooks/groupRemovalUndoToast';

function createGroup(overrides: Partial<GroupEntity> = {}): GroupEntity {
  return {
    groupId: 'group-1',
    name: 'Finance',
    colorToken: 'blue',
    isCollapsed: false,
    worksheetOrder: ['sheet-1'],
    createdAt: 1,
    ...overrides,
  };
}

describe('buildGroupRemovalUndoToast', () => {
  it('returns payload when worksheet removal empties the group', () => {
    const group = createGroup();
    const payload = buildGroupRemovalUndoToast({
      groupId: group.groupId,
      worksheetId: 'sheet-1',
      groupsById: { [group.groupId]: group },
      groupOrder: ['group-0', group.groupId],
    });

    expect(payload).not.toBeNull();
    expect(payload?.group.groupId).toBe(group.groupId);
    expect(payload?.worksheetId).toBe('sheet-1');
    expect(payload?.orderIndex).toBe(1);
    expect(payload?.message).toBe('Group Finance removed.');
    expect(payload?.group.worksheetOrder).toEqual(['sheet-1']);
    expect(payload?.group.worksheetOrder).not.toBe(group.worksheetOrder);
  });

  it('returns null when group has more than one worksheet', () => {
    const group = createGroup({ worksheetOrder: ['sheet-1', 'sheet-2'] });
    const payload = buildGroupRemovalUndoToast({
      groupId: group.groupId,
      worksheetId: 'sheet-1',
      groupsById: { [group.groupId]: group },
      groupOrder: [group.groupId],
    });

    expect(payload).toBeNull();
  });

  it('returns null when group id is missing or unknown', () => {
    const payloadWithoutId = buildGroupRemovalUndoToast({
      groupId: null,
      worksheetId: 'sheet-1',
      groupsById: {},
      groupOrder: [],
    });
    const payloadUnknownGroup = buildGroupRemovalUndoToast({
      groupId: 'missing-group',
      worksheetId: 'sheet-1',
      groupsById: {},
      groupOrder: [],
    });

    expect(payloadWithoutId).toBeNull();
    expect(payloadUnknownGroup).toBeNull();
  });

  it('falls back order index to zero when group order does not include target group', () => {
    const group = createGroup();
    const payload = buildGroupRemovalUndoToast({
      groupId: group.groupId,
      worksheetId: 'sheet-1',
      groupsById: { [group.groupId]: group },
      groupOrder: ['another-group'],
    });

    expect(payload?.orderIndex).toBe(0);
  });
});
