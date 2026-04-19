import { describe, expect, it } from 'vitest';
import {
  buildDragCommit,
  buildWorksheetDragLayout,
  findWorksheetLocation,
  getWorksheetEntitiesForContainer,
  getWorksheetIdsForContainer,
  moveWorksheetInLayout,
  parseGroupIdFromContainerId,
  toGroupContainerId,
} from '../../src/ui/taskpane/dnd/worksheetDndModel';

describe('worksheetDndModel', () => {
  it('builds a drag layout from the navigator view', () => {
    const layout = buildWorksheetDragLayout({
      pinned: [],
      groups: [
        {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'green',
          isCollapsed: false,
          worksheets: [
            {
              worksheetId: 'sheet-2',
              name: 'Budget',
              visibility: 'Visible',
              workbookOrder: 1,
              isPinned: false,
              groupId: 'group-1',
              lastKnownStructuralState: null,
            },
          ],
        },
      ],
      ungrouped: [
        {
          worksheetId: 'sheet-1',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 0,
          isPinned: false,
          groupId: null,
          lastKnownStructuralState: null,
        },
      ],
      hidden: [],
      searchResults: [],
    });

    expect(layout).toEqual({
      sheets: ['sheet-1'],
      groups: {
        'group-1': ['sheet-2'],
      },
    });
  });

  it('moves a worksheet from Sheets into a group layout', () => {
    const layout = moveWorksheetInLayout(
      {
        sheets: ['sheet-1', 'sheet-2'],
        groups: {
          'group-1': ['sheet-3'],
        },
      },
      'sheet-2',
      {
        containerId: toGroupContainerId('group-1'),
        index: 1,
        kind: 'group-header',
      },
    );

    expect(layout).toEqual({
      sheets: ['sheet-1'],
      groups: {
        'group-1': ['sheet-3', 'sheet-2'],
      },
    });
  });

  it('clamps destination indexes when projecting a move', () => {
    const layout = moveWorksheetInLayout(
      {
        sheets: ['sheet-1'],
        groups: {
          'group-1': ['sheet-2', 'sheet-3'],
        },
      },
      'sheet-1',
      {
        containerId: toGroupContainerId('group-1'),
        index: 99,
        kind: 'container-end',
      },
    );

    expect(layout).toEqual({
      sheets: [],
      groups: {
        'group-1': ['sheet-2', 'sheet-3', 'sheet-1'],
      },
    });
  });

  it('finds the final location and translates it into a domain commit', () => {
    const finalLayout = {
      sheets: ['sheet-1'],
      groups: {
        'group-1': ['sheet-3', 'sheet-2'],
      },
    };

    const finalLocation = findWorksheetLocation(finalLayout, 'sheet-2');

    expect(finalLocation).toEqual({
      containerId: 'group:group-1',
      index: 1,
    });

    expect(
      buildDragCommit(
        'sheet-2',
        {
          containerId: 'sheets',
          index: 1,
        },
        finalLocation!,
      ),
    ).toEqual({
      kind: 'assign-to-group',
      worksheetId: 'sheet-2',
      groupId: 'group-1',
      targetIndex: 1,
    });
  });

  it('builds a remove-from-group commit when dropping back into Sheets', () => {
    expect(
      buildDragCommit(
        'sheet-1',
        {
          containerId: 'group:group-1',
          index: 1,
        },
        {
          containerId: 'sheets',
          index: 0,
        },
      ),
    ).toEqual({
      kind: 'remove-from-group',
      worksheetId: 'sheet-1',
      targetIndex: 0,
    });
  });

  it('builds an assign-to-group commit when moving between groups', () => {
    expect(
      buildDragCommit(
        'sheet-1',
        {
          containerId: 'group:group-1',
          index: 0,
        },
        {
          containerId: 'group:group-2',
          index: 1,
        },
      ),
    ).toEqual({
      kind: 'assign-to-group',
      worksheetId: 'sheet-1',
      groupId: 'group-2',
      targetIndex: 1,
    });
  });

  it('ignores no-op reorder when dragging a worksheet back to its original same-index location', () => {
    expect(
      buildDragCommit(
        'sheet-1',
        {
          containerId: 'group:group-1',
          index: 0,
        },
        {
          containerId: 'group:group-1',
          index: 1,
        },
      ),
    ).toBeNull();
  });

  it('normalizes downward same-container destinations when computing reorder targets', () => {
    expect(
      buildDragCommit(
        'sheet-1',
        {
          containerId: 'group:group-1',
          index: 0,
        },
        {
          containerId: 'group:group-1',
          index: 2,
        },
      ),
    ).toEqual({
      kind: 'reorder-group',
      worksheetId: 'sheet-1',
      groupId: 'group-1',
      targetIndex: 1,
    });
  });

  it('normalizes downward sheet-section destinations when computing reorder targets', () => {
    expect(
      buildDragCommit(
        'sheet-1',
        {
          containerId: 'sheets',
          index: 0,
        },
        {
          containerId: 'sheets',
          index: 3,
        },
      ),
    ).toEqual({
      kind: 'reorder-sheet-section',
      worksheetId: 'sheet-1',
      targetIndex: 2,
    });
  });

  describe('parseGroupIdFromContainerId', () => {
    it('extracts group ID from group container ID', () => {
      expect(parseGroupIdFromContainerId('group:group-1')).toBe('group-1');
      expect(parseGroupIdFromContainerId('group:finance-team')).toBe('finance-team');
    });

    it('returns null for sheets container', () => {
      expect(parseGroupIdFromContainerId('sheets')).toBeNull();
    });
  });

  describe('getWorksheetIdsForContainer', () => {
    const layout = {
      sheets: ['sheet-1', 'sheet-2'],
      groups: {
        'group-1': ['sheet-3', 'sheet-4'],
        'group-2': ['sheet-5'],
      },
    };

    it('returns sheets for sheets container', () => {
      expect(getWorksheetIdsForContainer(layout, 'sheets')).toEqual(['sheet-1', 'sheet-2']);
    });

    it('returns group worksheets for group container', () => {
      expect(getWorksheetIdsForContainer(layout, toGroupContainerId('group-1'))).toEqual([
        'sheet-3',
        'sheet-4',
      ]);
      expect(getWorksheetIdsForContainer(layout, toGroupContainerId('group-2'))).toEqual(['sheet-5']);
    });

    it('returns empty array for non-existent group', () => {
      expect(getWorksheetIdsForContainer(layout, toGroupContainerId('non-existent'))).toEqual([]);
    });
  });

  describe('getWorksheetEntitiesForContainer', () => {
    const worksheetsById = {
      'sheet-1': {
        worksheetId: 'sheet-1',
        name: 'Revenue',
        visibility: 'Visible' as const,
        workbookOrder: 0,
        isPinned: false,
        groupId: null,
        lastKnownStructuralState: null,
      },
      'sheet-2': {
        worksheetId: 'sheet-2',
        name: 'Expenses',
        visibility: 'Visible' as const,
        workbookOrder: 1,
        isPinned: false,
        groupId: null,
        lastKnownStructuralState: null,
      },
    };

    const layout = {
      sheets: ['sheet-1', 'sheet-2'],
      groups: {},
    };

    const fallback: ReturnType<typeof getWorksheetEntitiesForContainer> = [];

    it('returns entities for container when layout exists', () => {
      const entities = getWorksheetEntitiesForContainer(layout, 'sheets', fallback, worksheetsById);
      expect(entities).toHaveLength(2);
      expect(entities[0].worksheetId).toBe('sheet-1');
      expect(entities[1].worksheetId).toBe('sheet-2');
    });

    it('returns fallback when layout is null', () => {
      const fallbackEntities = [
        { ...worksheetsById['sheet-1'], name: 'Fallback' },
      ];
      const entities = getWorksheetEntitiesForContainer(null, 'sheets', fallbackEntities, worksheetsById);
      expect(entities).toBe(fallbackEntities);
    });

    it('filters out missing worksheet IDs gracefully', () => {
      const layoutWithMissing = {
        sheets: ['sheet-1', 'missing-sheet', 'sheet-2'],
        groups: {},
      };
      const entities = getWorksheetEntitiesForContainer(
        layoutWithMissing,
        'sheets',
        fallback,
        worksheetsById,
      );
      expect(entities).toHaveLength(2);
      expect(entities.map((e) => e.worksheetId)).toEqual(['sheet-1', 'sheet-2']);
    });
  });

  describe('moveWorksheetInLayout', () => {
    it('returns same layout when worksheet is not found', () => {
      const layout = {
        sheets: ['sheet-1'],
        groups: {},
      };
      const result = moveWorksheetInLayout(layout, 'non-existent', {
        containerId: 'sheets',
        index: 0,
        kind: 'gap',
      });
      expect(result).toBe(layout);
    });

    it('moves within the same container', () => {
      const layout = {
        sheets: ['sheet-1', 'sheet-2', 'sheet-3'],
        groups: {},
      };
      const result = moveWorksheetInLayout(layout, 'sheet-1', {
        containerId: 'sheets',
        index: 2,
        kind: 'gap',
      });
      expect(result.sheets).toEqual(['sheet-2', 'sheet-3', 'sheet-1']);
    });
  });

  describe('findWorksheetLocation', () => {
    it('returns null when worksheet is not found', () => {
      const layout = {
        sheets: ['sheet-1'],
        groups: {
          'group-1': ['sheet-2'],
        },
      };
      expect(findWorksheetLocation(layout, 'non-existent')).toBeNull();
    });

    it('finds worksheet in sheets', () => {
      const layout = {
        sheets: ['sheet-1', 'sheet-2'],
        groups: {},
      };
      expect(findWorksheetLocation(layout, 'sheet-2')).toEqual({
        containerId: 'sheets',
        index: 1,
      });
    });

    it('finds worksheet in multiple groups', () => {
      const layout = {
        sheets: [],
        groups: {
          'group-1': ['sheet-1'],
          'group-2': ['sheet-2', 'sheet-3'],
        },
      };
      expect(findWorksheetLocation(layout, 'sheet-3')).toEqual({
        containerId: 'group:group-2',
        index: 1,
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty layout gracefully', () => {
      const layout = {
        sheets: [],
        groups: {},
      };
      expect(findWorksheetLocation(layout, 'any')).toBeNull();
      expect(getWorksheetIdsForContainer(layout, 'sheets')).toEqual([]);
    });

    it('preserves immutability when moving to same position', () => {
      const layout = {
        sheets: ['sheet-1', 'sheet-2'],
        groups: {},
      };
      const result = moveWorksheetInLayout(layout, 'sheet-1', {
        containerId: 'sheets',
        index: 0,
        kind: 'gap',
      });
      // Should return a new object even if content is same
      expect(result).not.toBe(layout);
      expect(result.sheets).toEqual(['sheet-1', 'sheet-2']);
    });
  });
});
