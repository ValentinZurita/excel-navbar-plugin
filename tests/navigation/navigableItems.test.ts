import { describe, expect, it } from 'vitest';
import {
  buildNavigableItems,
  getFirstItem,
  getLastItem,
  getNextItem,
  getPrevItem,
  hasItem,
} from '../../src/domain/navigation/navigableItems';
import type {
  NavigatorGroupView,
  SearchResultItem,
  WorksheetEntity,
} from '../../src/domain/navigation/types';

function createWorksheet(id: string, name: string): WorksheetEntity {
  return {
    worksheetId: id,
    name,
    visibility: 'Visible',
    workbookOrder: 0,
    isPinned: false,
    groupId: null,
    lastKnownStructuralState: null,
  };
}

function createSearchResult(id: string, name: string): SearchResultItem {
  return {
    worksheetId: id,
    name,
    visibility: 'Visible',
    isPinned: false,
    isGrouped: false,
    groupName: null,
  };
}

function createGroupView(
  id: string,
  name: string,
  worksheets: WorksheetEntity[],
  isCollapsed = false,
): NavigatorGroupView {
  return {
    groupId: id,
    name,
    colorToken: 'none',
    isCollapsed,
    worksheets,
  };
}

describe('buildNavigableItems', () => {
  it('returns empty array for empty state', () => {
    const items = buildNavigableItems({
      query: '',
      searchResults: [],
      pinned: [],
      groups: [],
      ungrouped: [],
      hidden: [],
    });

    expect(items).toEqual([]);
  });

  it('returns only search results when query is active', () => {
    const items = buildNavigableItems({
      query: 'revenue',
      searchResults: [
        createSearchResult('sheet-1', 'Q1 Revenue'),
        createSearchResult('sheet-2', 'Q2 Revenue'),
      ],
      pinned: [createWorksheet('sheet-3', 'Pinned Sheet')],
      groups: [createGroupView('group-1', 'Finance', [createWorksheet('sheet-4', 'Budget')])],
      ungrouped: [createWorksheet('sheet-5', 'Ungrouped')],
      hidden: [createWorksheet('sheet-6', 'Hidden')],
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: 'search:sheet-1',
      kind: 'search-result',
      name: 'Q1 Revenue',
    });
    expect(items[1]).toMatchObject({
      id: 'search:sheet-2',
      kind: 'search-result',
      name: 'Q2 Revenue',
    });
  });

  it('returns empty array when search has no results', () => {
    const items = buildNavigableItems({
      query: 'xyz',
      searchResults: [],
      pinned: [],
      groups: [],
      ungrouped: [],
      hidden: [],
    });

    expect(items).toEqual([]);
  });

  it('includes pinned worksheets in order', () => {
    const items = buildNavigableItems({
      query: '',
      searchResults: [],
      pinned: [createWorksheet('sheet-1', 'Pinned A'), createWorksheet('sheet-2', 'Pinned B')],
      groups: [],
      ungrouped: [],
      hidden: [],
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: 'worksheet:sheet-1',
      kind: 'worksheet',
      name: 'Pinned A',
    });
    expect(items[1]).toMatchObject({
      id: 'worksheet:sheet-2',
      kind: 'worksheet',
      name: 'Pinned B',
    });
  });

  it('includes group header and worksheets in expanded group', () => {
    const items = buildNavigableItems({
      query: '',
      searchResults: [],
      pinned: [],
      groups: [
        createGroupView(
          'group-1',
          'Finance',
          [createWorksheet('sheet-1', 'Budget'), createWorksheet('sheet-2', 'Forecast')],
          false,
        ),
      ],
      ungrouped: [],
      hidden: [],
    });

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      id: 'group-header:group-1',
      kind: 'group-header',
      name: 'Finance',
    });
    expect(items[1]).toMatchObject({
      id: 'worksheet:sheet-1',
      kind: 'worksheet',
      name: 'Budget',
      groupId: 'group-1',
    });
    expect(items[2]).toMatchObject({
      id: 'worksheet:sheet-2',
      kind: 'worksheet',
      name: 'Forecast',
      groupId: 'group-1',
    });
  });

  it('includes only group header for collapsed group', () => {
    const items = buildNavigableItems({
      query: '',
      searchResults: [],
      pinned: [],
      groups: [createGroupView('group-1', 'Finance', [createWorksheet('sheet-1', 'Budget')], true)],
      ungrouped: [],
      hidden: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'group-header:group-1',
      kind: 'group-header',
      isGroupCollapsed: true,
      name: 'Finance',
    });
  });

  it('includes ungrouped worksheets after groups', () => {
    const items = buildNavigableItems({
      query: '',
      searchResults: [],
      pinned: [createWorksheet('sheet-1', 'Pinned')],
      groups: [
        createGroupView('group-1', 'Finance', [createWorksheet('sheet-2', 'Budget')], false),
      ],
      ungrouped: [createWorksheet('sheet-3', 'Ungrouped')],
      hidden: [],
    });

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ kind: 'worksheet', name: 'Pinned' });
    expect(items[1]).toMatchObject({ kind: 'group-header', name: 'Finance' });
    expect(items[2]).toMatchObject({ kind: 'worksheet', name: 'Budget' });
    expect(items[3]).toMatchObject({ kind: 'worksheet', name: 'Ungrouped' });
  });

  it('includes Hidden worksheets after visible sections when expanded', () => {
    const hiddenWorksheet = createWorksheet('sheet-hidden', 'Archive');
    hiddenWorksheet.visibility = 'Hidden';

    const items = buildNavigableItems({
      query: '',
      searchResults: [],
      pinned: [createWorksheet('sheet-1', 'Pinned')],
      groups: [],
      ungrouped: [createWorksheet('sheet-2', 'Ungrouped')],
      hidden: [hiddenWorksheet],
    });

    expect(items).toHaveLength(3);
    expect(items[2]).toMatchObject({
      id: 'worksheet:sheet-hidden',
      kind: 'hidden-worksheet',
      name: 'Archive',
    });
  });

  it('handles whitespace-only query as empty', () => {
    const items = buildNavigableItems({
      query: '   ',
      searchResults: [],
      pinned: [createWorksheet('sheet-1', 'Pinned')],
      groups: [],
      ungrouped: [],
      hidden: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('worksheet');
  });
});

describe('getNextItem', () => {
  const items = [
    { id: 'worksheet:1', kind: 'worksheet' as const, name: 'First' },
    { id: 'group-header:1', kind: 'group-header' as const, name: 'Group' },
    { id: 'worksheet:2', kind: 'worksheet' as const, name: 'Last' },
  ];

  it('returns next item in list', () => {
    const next = getNextItem('worksheet:1', items);
    expect(next?.id).toBe('group-header:1');
  });

  it('returns null at last item', () => {
    const next = getNextItem('worksheet:2', items);
    expect(next).toBeNull();
  });

  it('returns null for unknown id', () => {
    const next = getNextItem('worksheet:unknown', items);
    expect(next).toBeNull();
  });

  it('returns null for empty list', () => {
    const next = getNextItem('worksheet:1', []);
    expect(next).toBeNull();
  });
});

describe('getPrevItem', () => {
  const items = [
    { id: 'worksheet:1', kind: 'worksheet' as const, name: 'First' },
    { id: 'group-header:1', kind: 'group-header' as const, name: 'Group' },
    { id: 'worksheet:2', kind: 'worksheet' as const, name: 'Last' },
  ];

  it('returns previous item in list', () => {
    const prev = getPrevItem('group-header:1', items, false);
    expect(prev?.id).toBe('worksheet:1');
  });

  it('returns null at first item when search is not active', () => {
    const prev = getPrevItem('worksheet:1', items, false);
    expect(prev).toBeNull();
  });

  it('returns search input sentinel at first item when search is active', () => {
    const prev = getPrevItem('worksheet:1', items, true);
    expect(prev?.id).toBe('__search_input__');
  });

  it('returns null at first item when search is not active even with empty query', () => {
    const prev = getPrevItem('worksheet:1', items, false);
    expect(prev).toBeNull();
  });

  it('returns null for unknown id', () => {
    const prev = getPrevItem('worksheet:unknown', items, false);
    expect(prev).toBeNull();
  });

  it('returns null for empty list', () => {
    const prev = getPrevItem('worksheet:1', [], false);
    expect(prev).toBeNull();
  });
});

describe('getFirstItem', () => {
  it('returns first item', () => {
    const items = [
      { id: 'worksheet:1', kind: 'worksheet' as const, name: 'First' },
      { id: 'worksheet:2', kind: 'worksheet' as const, name: 'Second' },
    ];

    expect(getFirstItem(items)?.id).toBe('worksheet:1');
  });

  it('returns null for empty list', () => {
    expect(getFirstItem([])).toBeNull();
  });
});

describe('getLastItem', () => {
  it('returns last item', () => {
    const items = [
      { id: 'worksheet:1', kind: 'worksheet' as const, name: 'First' },
      { id: 'worksheet:2', kind: 'worksheet' as const, name: 'Last' },
    ];

    expect(getLastItem(items)?.id).toBe('worksheet:2');
  });

  it('returns null for empty list', () => {
    expect(getLastItem([])).toBeNull();
  });
});

describe('hasItem', () => {
  const items = [{ id: 'worksheet:1', kind: 'worksheet' as const, name: 'First' }];

  it('returns true for existing item', () => {
    expect(hasItem('worksheet:1', items)).toBe(true);
  });

  it('returns false for non-existing item', () => {
    expect(hasItem('worksheet:unknown', items)).toBe(false);
  });

  it('returns false for empty list', () => {
    expect(hasItem('worksheet:1', [])).toBe(false);
  });
});
