import { describe, expect, it } from 'vitest';
import { createDefaultNavigationState } from '../../src/domain/navigation/defaultState';
import { buildNavigatorView } from '../../src/domain/navigation/selectors';
import type { GroupEntity, WorksheetEntity } from '../../src/domain/navigation/types';

function worksheet(partial: Partial<WorksheetEntity>): WorksheetEntity {
  return {
    worksheetId: partial.worksheetId ?? 'sheet',
    name: partial.name ?? 'Sheet',
    visibility: partial.visibility ?? 'Visible',
    workbookOrder: partial.workbookOrder ?? 0,
    isPinned: partial.isPinned ?? false,
    groupId: partial.groupId ?? null,
    lastKnownStructuralState: partial.lastKnownStructuralState ?? null,
  };
}

function group(partial: Partial<GroupEntity>): GroupEntity {
  return {
    groupId: partial.groupId ?? 'group-1',
    name: partial.name ?? 'Core',
    colorToken: partial.colorToken ?? 'blue',
    isCollapsed: partial.isCollapsed ?? true,
    worksheetOrder: partial.worksheetOrder ?? [],
    createdAt: partial.createdAt ?? 1,
  };
}

describe('buildNavigatorView', () => {
  it('separates pinned, grouped, ungrouped, and hidden worksheets', () => {
    const state = createDefaultNavigationState();
    state.sheetSectionOrder = ['three', 'one', 'two', 'four'];
    state.worksheetsById = {
      one: worksheet({ worksheetId: 'one', name: 'Overview', isPinned: true }),
      two: worksheet({ worksheetId: 'two', name: 'Revenue', groupId: 'group-1', workbookOrder: 1 }),
      three: worksheet({ worksheetId: 'three', name: 'Draft', workbookOrder: 2 }),
      four: worksheet({ worksheetId: 'four', name: 'Archive', visibility: 'Hidden', workbookOrder: 3 }),
    };
    state.groupsById = { 'group-1': group({ worksheetOrder: ['two'] }) };
    state.groupOrder = ['group-1'];

    const view = buildNavigatorView(state);

    expect(view.pinned.map((item) => item.worksheetId)).toEqual(['one']);
    expect(view.groups[0].worksheets.map((item) => item.worksheetId)).toEqual(['two']);
    expect(view.ungrouped.map((item) => item.worksheetId)).toEqual(['three']);
    expect(view.hidden.map((item) => item.worksheetId)).toEqual(['four']);
  });

  it('uses the persisted Sheets-section order for ungrouped worksheets', () => {
    const state = createDefaultNavigationState();
    state.sheetSectionOrder = ['three', 'one', 'two'];
    state.worksheetsById = {
      one: worksheet({ worksheetId: 'one', name: 'Overview', workbookOrder: 0 }),
      two: worksheet({ worksheetId: 'two', name: 'Revenue', workbookOrder: 1 }),
      three: worksheet({ worksheetId: 'three', name: 'Draft', workbookOrder: 2 }),
    };

    const view = buildNavigatorView(state);

    expect(view.ungrouped.map((item) => item.worksheetId)).toEqual(['three', 'one', 'two']);
  });

  it('returns search results with subtle group context', () => {
    const state = createDefaultNavigationState();
    state.query = 'rev';
    state.worksheetsById = {
      two: worksheet({ worksheetId: 'two', name: 'Revenue', groupId: 'group-1' }),
    };
    state.groupsById = { 'group-1': group({ name: 'Finance', worksheetOrder: ['two'] }) };
    state.groupOrder = ['group-1'];

    const view = buildNavigatorView(state);

    expect(view.searchResults).toEqual([
      {
        worksheetId: 'two',
        name: 'Revenue',
        visibility: 'Visible',
        isPinned: false,
        groupName: 'Finance',
      },
    ]);
  });
});
