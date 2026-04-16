import { describe, expect, it } from 'vitest';
import { createDefaultNavigationState } from '../../src/domain/navigation/defaultState';
import { toPersistedModel } from '../../src/domain/navigation/persistenceModel';

describe('toPersistedModel', () => {
  it('serializes meaningful workbook UI state only', () => {
    const state = createDefaultNavigationState();
    state.hiddenSectionCollapsed = false;
    state.groupOrder = ['group-1'];
    state.sheetSectionOrder = ['sheet-2', 'sheet-1'];
    state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: true,
        worksheetOrder: ['sheet-2'],
        createdAt: 1,
      },
    };
    state.worksheetsById = {
      'sheet-1': {
        worksheetId: 'sheet-1',
        name: 'Overview',
        visibility: 'Visible',
        workbookOrder: 0,
        isPinned: true,
        groupId: null,
        lastKnownStructuralState: { kind: 'pinned' },
      },
      'sheet-2': {
        worksheetId: 'sheet-2',
        name: 'Revenue',
        visibility: 'Visible',
        workbookOrder: 1,
        isPinned: false,
        groupId: 'group-1',
        lastKnownStructuralState: { kind: 'group', groupId: 'group-1' },
      },
    };

    expect(toPersistedModel(state)).toEqual({
      schemaVersion: 2,
      identityMode: 'native-id',
      groups: [state.groupsById['group-1']],
      sheetSectionOrder: ['sheet-2', 'sheet-1'],
      pinnedWorksheetOrder: ['sheet-1'],
      hiddenSectionCollapsed: false,
      priorStructuralStateByStableWorksheetId: {
        'sheet-1': { kind: 'pinned' },
        'sheet-2': { kind: 'group', groupId: 'group-1' },
      },
      updatedAt: 0,
    });
  });
});
