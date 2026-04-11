import { describe, expect, it } from 'vitest';
import {
  buildDragCommit,
  buildWorksheetDragLayout,
  findWorksheetLocation,
  moveWorksheetInLayout,
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
});
