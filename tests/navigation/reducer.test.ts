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
      colorToken: 'blue',
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

  it('moves a grouped worksheet to pinned when pinning it', () => {
    const state = createDefaultNavigationState();
    state.groupOrder = ['group-1'];
    state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: false,
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

    const nextState = navigationReducer(state, { type: 'pinWorksheet', worksheetId: 'one' });

    expect(nextState.worksheetsById.one.isPinned).toBe(true);
    expect(nextState.worksheetsById.one.groupId).toBeNull();
    expect(nextState.worksheetsById.one.lastKnownStructuralState).toEqual({ kind: 'pinned' });
    expect(nextState.groupsById['group-1'].worksheetOrder).toEqual([]);
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

  it('creates a group with no color when colorToken is none', () => {
    const state = createDefaultNavigationState();

    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(200);

    const nextState = navigationReducer(state, {
      type: 'createGroup',
      name: 'NoColor',
      colorToken: 'none',
    });

    expect(nextState.groupsById['group-200'].colorToken).toBe('none');
  });

  it('changes group color to none via setGroupColor', () => {
    const state = createDefaultNavigationState();
    state.groupOrder = ['group-1'];
    state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'blue',
        isCollapsed: false,
        worksheetOrder: [],
        createdAt: 1,
      },
    };

    const nextState = navigationReducer(state, {
      type: 'setGroupColor',
      groupId: 'group-1',
      colorToken: 'none',
    });

    expect(nextState.groupsById['group-1'].colorToken).toBe('none');
  });

  it('changes group color from none to a regular color via setGroupColor', () => {
    const state = createDefaultNavigationState();
    state.groupOrder = ['group-1'];
    state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'none',
        isCollapsed: false,
        worksheetOrder: [],
        createdAt: 1,
      },
    };

    const nextState = navigationReducer(state, {
      type: 'setGroupColor',
      groupId: 'group-1',
      colorToken: 'green',
    });

    expect(nextState.groupsById['group-1'].colorToken).toBe('green');
  });

  it('never assigns none as the automatic group color', () => {
    const state = createDefaultNavigationState();

    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(300)
      .mockReturnValueOnce(300);

    // createGroup without explicit colorToken falls back to nextGroupColor
    // which rotates through groupColorTokens (excludes 'none')
    const nextState = navigationReducer(state, {
      type: 'createGroup',
      name: 'Auto',
      colorToken: 'blue',
    });

    // Always a real color, never 'none'
    expect(nextState.groupsById['group-300'].colorToken).not.toBe('none');
  });

  describe('reorderPinnedWorksheet', () => {
    it('reorders pinned worksheets within the pinned section', () => {
      const state = createDefaultNavigationState();
      state.pinnedWorksheetOrder = ['sheet-1', 'sheet-2', 'sheet-3'];
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'One',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
        'sheet-2': {
          worksheetId: 'sheet-2',
          name: 'Two',
          visibility: 'Visible',
          workbookOrder: 1,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
        'sheet-3': {
          worksheetId: 'sheet-3',
          name: 'Three',
          visibility: 'Visible',
          workbookOrder: 2,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
      };

      const nextState = navigationReducer(state, {
        type: 'reorderPinnedWorksheet',
        worksheetId: 'sheet-3',
        targetIndex: 0,
      });

      expect(nextState.pinnedWorksheetOrder).toEqual(['sheet-3', 'sheet-1', 'sheet-2']);
    });

    it('ignores reorder for non-pinned worksheets', () => {
      const state = createDefaultNavigationState();
      state.pinnedWorksheetOrder = ['sheet-1'];
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'One',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
        'sheet-2': {
          worksheetId: 'sheet-2',
          name: 'Two',
          visibility: 'Visible',
          workbookOrder: 1,
          isPinned: false,
          groupId: null,
          lastKnownStructuralState: null,
        },
      };

      const nextState = navigationReducer(state, {
        type: 'reorderPinnedWorksheet',
        worksheetId: 'sheet-2',
        targetIndex: 0,
      });

      // State should remain unchanged
      expect(nextState.pinnedWorksheetOrder).toEqual(['sheet-1']);
    });
  });

  describe('pinWorksheet pinnedWorksheetOrder', () => {
    it('adds worksheet to pinnedWorksheetOrder when pinning', () => {
      const state = createDefaultNavigationState();
      state.pinnedWorksheetOrder = ['sheet-1'];
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'One',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
        'sheet-2': {
          worksheetId: 'sheet-2',
          name: 'Two',
          visibility: 'Visible',
          workbookOrder: 1,
          isPinned: false,
          groupId: null,
          lastKnownStructuralState: null,
        },
      };

      const nextState = navigationReducer(state, {
        type: 'pinWorksheet',
        worksheetId: 'sheet-2',
      });

      expect(nextState.pinnedWorksheetOrder).toContain('sheet-2');
      expect(nextState.pinnedWorksheetOrder).toHaveLength(2);
    });

    it('does not duplicate worksheet in pinnedWorksheetOrder when already pinned', () => {
      const state = createDefaultNavigationState();
      state.pinnedWorksheetOrder = ['sheet-1'];
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'One',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
      };

      const nextState = navigationReducer(state, {
        type: 'pinWorksheet',
        worksheetId: 'sheet-1',
      });

      expect(nextState.pinnedWorksheetOrder).toEqual(['sheet-1']);
      expect(nextState.pinnedWorksheetOrder).toHaveLength(1);
    });
  });

  describe('unpinWorksheet pinnedWorksheetOrder', () => {
    it('removes worksheet from pinnedWorksheetOrder when unpinning', () => {
      const state = createDefaultNavigationState();
      state.pinnedWorksheetOrder = ['sheet-1', 'sheet-2', 'sheet-3'];
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'One',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
        'sheet-2': {
          worksheetId: 'sheet-2',
          name: 'Two',
          visibility: 'Visible',
          workbookOrder: 1,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
        'sheet-3': {
          worksheetId: 'sheet-3',
          name: 'Three',
          visibility: 'Visible',
          workbookOrder: 2,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
      };

      const nextState = navigationReducer(state, {
        type: 'unpinWorksheet',
        worksheetId: 'sheet-2',
      });

      expect(nextState.pinnedWorksheetOrder).toEqual(['sheet-1', 'sheet-3']);
    });
  });

  describe('deleteWorksheet', () => {
    it('removes worksheet from worksheetsById', () => {
      const state = createDefaultNavigationState();
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: false,
          groupId: null,
          lastKnownStructuralState: null,
        },
        'sheet-2': {
          worksheetId: 'sheet-2',
          name: 'Expenses',
          visibility: 'Visible',
          workbookOrder: 1,
          isPinned: false,
          groupId: null,
          lastKnownStructuralState: null,
        },
      };
      state.sheetSectionOrder = ['sheet-1', 'sheet-2'];

      const nextState = navigationReducer(state, {
        type: 'deleteWorksheet',
        worksheetId: 'sheet-1',
      });

      expect(nextState.worksheetsById['sheet-1']).toBeUndefined();
      expect(nextState.worksheetsById['sheet-2']).toBeDefined();
    });

    it('removes worksheet from pinnedWorksheetOrder', () => {
      const state = createDefaultNavigationState();
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: true,
          groupId: null,
          lastKnownStructuralState: { kind: 'pinned' },
        },
      };
      state.pinnedWorksheetOrder = ['sheet-1'];

      const nextState = navigationReducer(state, {
        type: 'deleteWorksheet',
        worksheetId: 'sheet-1',
      });

      expect(nextState.pinnedWorksheetOrder).not.toContain('sheet-1');
      expect(nextState.pinnedWorksheetOrder).toHaveLength(0);
    });

    it('removes worksheet from its group', () => {
      const state = createDefaultNavigationState();
      state.groupOrder = ['group-1'];
      state.groupsById = {
        'group-1': {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'blue',
          isCollapsed: false,
          worksheetOrder: ['sheet-1', 'sheet-2'],
          createdAt: 1000,
        },
      };
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: false,
          groupId: 'group-1',
          lastKnownStructuralState: { kind: 'group', groupId: 'group-1' },
        },
        'sheet-2': {
          worksheetId: 'sheet-2',
          name: 'Expenses',
          visibility: 'Visible',
          workbookOrder: 1,
          isPinned: false,
          groupId: 'group-1',
          lastKnownStructuralState: { kind: 'group', groupId: 'group-1' },
        },
      };

      const nextState = navigationReducer(state, {
        type: 'deleteWorksheet',
        worksheetId: 'sheet-1',
      });

      expect(nextState.groupsById['group-1'].worksheetOrder).not.toContain('sheet-1');
      expect(nextState.groupsById['group-1'].worksheetOrder).toContain('sheet-2');
    });

    it('removes worksheet from sheetSectionOrder', () => {
      const state = createDefaultNavigationState();
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: false,
          groupId: null,
          lastKnownStructuralState: null,
        },
        'sheet-2': {
          worksheetId: 'sheet-2',
          name: 'Expenses',
          visibility: 'Visible',
          workbookOrder: 1,
          isPinned: false,
          groupId: null,
          lastKnownStructuralState: null,
        },
      };
      state.sheetSectionOrder = ['sheet-1', 'sheet-2'];

      const nextState = navigationReducer(state, {
        type: 'deleteWorksheet',
        worksheetId: 'sheet-1',
      });

      expect(nextState.sheetSectionOrder).not.toContain('sheet-1');
      expect(nextState.sheetSectionOrder).toContain('sheet-2');
    });

    it('handles non-existent worksheet gracefully', () => {
      const state = createDefaultNavigationState();
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: false,
          groupId: null,
          lastKnownStructuralState: null,
        },
      };

      // Should not throw error
      expect(() =>
        navigationReducer(state, {
          type: 'deleteWorksheet',
          worksheetId: 'non-existent',
        }),
      ).not.toThrow();

      // State should remain unchanged
      const nextState = navigationReducer(state, {
        type: 'deleteWorksheet',
        worksheetId: 'non-existent',
      });

      expect(nextState.worksheetsById['sheet-1']).toBeDefined();
    });

    it('cleans up worksheet from multiple groups if somehow referenced', () => {
      const state = createDefaultNavigationState();
      state.groupOrder = ['group-1', 'group-2'];
      state.groupsById = {
        'group-1': {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'blue',
          isCollapsed: false,
          worksheetOrder: ['sheet-1'],
          createdAt: 1000,
        },
        'group-2': {
          groupId: 'group-2',
          name: 'Sales',
          colorToken: 'green',
          isCollapsed: false,
          worksheetOrder: ['sheet-1'], // Same sheet erroneously in both groups
          createdAt: 2000,
        },
      };
      state.worksheetsById = {
        'sheet-1': {
          worksheetId: 'sheet-1',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: false,
          groupId: 'group-1',
          lastKnownStructuralState: { kind: 'group', groupId: 'group-1' },
        },
      };

      const nextState = navigationReducer(state, {
        type: 'deleteWorksheet',
        worksheetId: 'sheet-1',
      });

      // Should clean up from all groups
      expect(nextState.groupsById['group-1'].worksheetOrder).not.toContain('sheet-1');
      expect(nextState.groupsById['group-2'].worksheetOrder).not.toContain('sheet-1');
    });
  });
});
