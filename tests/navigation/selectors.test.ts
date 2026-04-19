import { describe, expect, it } from 'vitest';
import { createDefaultNavigationState } from '../../src/domain/navigation/defaultState';
import {
  buildNavigatorStructure,
  buildNavigatorView,
  buildSearchResults,
} from '../../src/domain/navigation/selectors';
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
        isGrouped: true,
        groupName: 'Finance',
        groupColor: 'blue',
      },
    ]);
  });

  it('builds structural sections without depending on query changes', () => {
    const state = createDefaultNavigationState();
    state.sheetSectionOrder = ['two', 'one'];
    state.worksheetsById = {
      one: worksheet({ worksheetId: 'one', name: 'Overview', workbookOrder: 0 }),
      two: worksheet({ worksheetId: 'two', name: 'Revenue', workbookOrder: 1, isPinned: true }),
      three: worksheet({ worksheetId: 'three', name: 'Archive', visibility: 'Hidden', workbookOrder: 2 }),
    };

    const structureWithoutQuery = buildNavigatorStructure(state);
    state.query = 'rev';
    const structureWithQuery = buildNavigatorStructure(state);

    expect(structureWithQuery).toEqual(structureWithoutQuery);
  });

  it('returns empty search results when the query is blank after trimming', () => {
    const state = createDefaultNavigationState();
    state.query = '   ';
    state.worksheetsById = {
      one: worksheet({ worksheetId: 'one', name: 'Overview', workbookOrder: 0 }),
    };

    expect(buildSearchResults(state)).toEqual([]);
  });

  it('keeps buildNavigatorView output aligned with split structure and search selectors', () => {
    const state = createDefaultNavigationState();
    state.query = 'rev';
    state.pinnedWorksheetOrder = ['one'];
    state.worksheetsById = {
      one: worksheet({ worksheetId: 'one', name: 'Overview', isPinned: true, workbookOrder: 0 }),
      two: worksheet({ worksheetId: 'two', name: 'Revenue', groupId: 'group-1', workbookOrder: 1 }),
      three: worksheet({ worksheetId: 'three', name: 'Archive', visibility: 'Hidden', workbookOrder: 2 }),
    };
    state.groupsById = { 'group-1': group({ name: 'Finance', worksheetOrder: ['two'] }) };
    state.groupOrder = ['group-1'];

    expect(buildNavigatorView(state)).toEqual({
      ...buildNavigatorStructure(state),
      searchResults: buildSearchResults(state),
    });
  });

  it('honors persisted pinned order while keeping workbook order as the tie-breaker', () => {
    const state = createDefaultNavigationState();
    state.pinnedWorksheetOrder = ['three', 'one'];
    state.worksheetsById = {
      one: worksheet({ worksheetId: 'one', name: 'Overview', isPinned: true, workbookOrder: 0 }),
      two: worksheet({ worksheetId: 'two', name: 'Revenue', isPinned: true, workbookOrder: 1 }),
      three: worksheet({ worksheetId: 'three', name: 'Draft', isPinned: true, workbookOrder: 2 }),
    };

    const view = buildNavigatorView(state);

    expect(view.pinned.map((item) => item.worksheetId)).toEqual(['three', 'one', 'two']);
  });

  it('appends grouped worksheets missing from persisted order using workbook order', () => {
    const state = createDefaultNavigationState();
    state.worksheetsById = {
      one: worksheet({ worksheetId: 'one', name: 'Overview', groupId: 'group-1', workbookOrder: 0 }),
      two: worksheet({ worksheetId: 'two', name: 'Revenue', groupId: 'group-1', workbookOrder: 2 }),
      three: worksheet({ worksheetId: 'three', name: 'Budget', groupId: 'group-1', workbookOrder: 1 }),
    };
    state.groupsById = { 'group-1': group({ worksheetOrder: ['two'] }) };
    state.groupOrder = ['group-1'];

    const view = buildNavigatorView(state);

    expect(view.groups[0].worksheets.map((item) => item.worksheetId)).toEqual(['two', 'one', 'three']);
  });
});
