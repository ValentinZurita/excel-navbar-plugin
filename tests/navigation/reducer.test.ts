import { describe, expect, it, vi } from 'vitest';
import { createDefaultNavigationState } from '../../src/domain/navigation/defaultState';
import { navigationReducer } from '../../src/domain/navigation/reducer';

describe('navigationReducer', () => {
  it('creates a group with the source worksheet already inside it', () => {
    const state = createDefaultNavigationState();
    state.worksheetsById = {
      one: {
        worksheetId: 'one',
        name: 'Overview',
        visibility: 'Visible',
        workbookOrder: 0,
        isPinned: true,
        groupId: null,
        lastKnownStructuralState: { kind: 'pinned' },
      },
    };
    state.sheetSectionOrder = ['one'];

    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(100);

    const nextState = navigationReducer(state, {
      type: 'createGroup',
      name: 'Finance',
      initialWorksheetId: 'one',
    });

    expect(nextState.groupOrder).toEqual(['group-100']);
    expect(nextState.groupsById['group-100'].worksheetOrder).toEqual(['one']);
    expect(nextState.worksheetsById.one.groupId).toBe('group-100');
    expect(nextState.worksheetsById.one.isPinned).toBe(false);
    expect(nextState.sheetSectionOrder).toEqual(['one']);
  });

  it('reorders a worksheet inside the Sheets section', () => {
    const state = createDefaultNavigationState();
    state.sheetSectionOrder = ['one', 'two', 'three'];
    state.worksheetsById = {
      one: { worksheetId: 'one', name: 'One', visibility: 'Visible', workbookOrder: 0, isPinned: false, groupId: null, lastKnownStructuralState: null },
      two: { worksheetId: 'two', name: 'Two', visibility: 'Visible', workbookOrder: 1, isPinned: false, groupId: null, lastKnownStructuralState: null },
      three: { worksheetId: 'three', name: 'Three', visibility: 'Visible', workbookOrder: 2, isPinned: false, groupId: null, lastKnownStructuralState: null },
    };

    const nextState = navigationReducer(state, {
      type: 'reorderSheetSectionWorksheet',
      worksheetId: 'three',
      targetIndex: 0,
    });

    expect(nextState.sheetSectionOrder).toEqual(['three', 'one', 'two']);
  });

  it('moves a grouped worksheet back to the Sheets section at the requested index', () => {
    const state = createDefaultNavigationState();
    state.groupOrder = ['group-1'];
    state.sheetSectionOrder = ['one', 'two', 'three'];
    state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: false,
        worksheetOrder: ['two'],
        createdAt: 1,
      },
    };
    state.worksheetsById = {
      one: { worksheetId: 'one', name: 'One', visibility: 'Visible', workbookOrder: 0, isPinned: false, groupId: null, lastKnownStructuralState: null },
      two: { worksheetId: 'two', name: 'Two', visibility: 'Visible', workbookOrder: 1, isPinned: false, groupId: 'group-1', lastKnownStructuralState: { kind: 'group', groupId: 'group-1' } },
      three: { worksheetId: 'three', name: 'Three', visibility: 'Visible', workbookOrder: 2, isPinned: false, groupId: null, lastKnownStructuralState: null },
    };

    const nextState = navigationReducer(state, {
      type: 'removeWorksheetFromGroup',
      worksheetId: 'two',
      targetIndex: 1,
    });

    expect(nextState.worksheetsById.two.groupId).toBeNull();
    expect(nextState.groupsById['group-1'].worksheetOrder).toEqual([]);
    expect(nextState.sheetSectionOrder).toEqual(['one', 'two', 'three']);
  });

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
    state.sheetSectionOrder = ['one'];
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
    expect(nextState.sheetSectionOrder).toEqual(['one']);
  });

  it('sets group collapsed state explicitly', () => {
    const state = createDefaultNavigationState();
    state.groupOrder = ['group-1'];
    state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Core',
        colorToken: 'blue',
        isCollapsed: true,
        worksheetOrder: [],
        createdAt: 1,
      },
    };

    const nextState = navigationReducer(state, {
      type: 'setGroupCollapsed',
      groupId: 'group-1',
      isCollapsed: false,
    });

    expect(nextState.groupsById['group-1'].isCollapsed).toBe(false);
  });
});
