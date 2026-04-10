  it('hides a worksheet and updates visibility', () => {
    const state = createDefaultNavigationState();
    state.worksheetsById = {
      one: {
        worksheetId: 'one',
        name: 'Overview',
        visibility: 'Visible',
        workbookOrder: 0,
        isPinned: false,
        groupId: null,
        lastKnownStructuralState: null,
      },
    };
    const nextState = navigationReducer(state, { type: 'markWorksheetHidden', worksheetId: 'one' });
    expect(nextState.worksheetsById.one.visibility).toBe('Hidden');
  });
import { describe, expect, it } from 'vitest';
import { createDefaultNavigationState } from '../../src/domain/navigation/defaultState';
import { navigationReducer } from '../../src/domain/navigation/reducer';

describe('navigationReducer', () => {
  it('prevents pinning a grouped worksheet', () => {
    const state = createDefaultNavigationState();
    state.worksheetsById = {
      one: {
        worksheetId: 'one',
        name: 'Overview',
        visibility: 'Visible',
        workbookOrder: 0,
        isPinned: false,
        groupId: 'group-1',
        lastKnownStructuralState: null,
      },
    };

    const nextState = navigationReducer(state, { type: 'pinWorksheet', worksheetId: 'one' });
    expect(nextState.worksheetsById.one.isPinned).toBe(false);
  });

  it('returns grouped sheets to ungrouped when a group is deleted', () => {
    const state = createDefaultNavigationState();
    state.groupOrder = ['group-1'];
    state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Core',
        colorToken: 'blue',
        isCollapsed: true,
        worksheetOrder: ['one'],
        createdAt: 1,
      },
    };
    state.worksheetsById = {
      one: {
        worksheetId: 'one',
        name: 'Overview',
        visibility: 'Visible',
        workbookOrder: 0,
        isPinned: false,
        groupId: 'group-1',
        lastKnownStructuralState: { kind: 'group', groupId: 'group-1' },
      },
    };

    const nextState = navigationReducer(state, { type: 'deleteGroup', groupId: 'group-1' });
    expect(nextState.worksheetsById.one.groupId).toBeNull();
    expect(nextState.groupOrder).toEqual([]);
  });
});
