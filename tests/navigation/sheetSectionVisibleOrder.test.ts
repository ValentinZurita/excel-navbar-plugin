import { describe, expect, it } from 'vitest';
import { applyMoveAmongUngroupedVisibleSheets } from '../../src/domain/navigation/sheetSectionVisibleOrder';
import type { WorksheetEntity } from '../../src/domain/navigation/types';

function worksheet(
  overrides: Partial<WorksheetEntity> & Pick<WorksheetEntity, 'worksheetId' | 'name' | 'workbookOrder'>,
): WorksheetEntity {
  return {
    visibility: 'Visible',
    isPinned: false,
    groupId: null,
    lastKnownStructuralState: null,
    ...overrides,
  };
}

describe('applyMoveAmongUngroupedVisibleSheets', () => {
  it('matches simple three-sheet reorder (regression vs legacy reducer logic)', () => {
    const worksheetsById: Record<string, WorksheetEntity> = {
      one: worksheet({ worksheetId: 'one', name: 'One', workbookOrder: 0 }),
      two: worksheet({ worksheetId: 'two', name: 'Two', workbookOrder: 1 }),
      three: worksheet({ worksheetId: 'three', name: 'Three', workbookOrder: 2 }),
    };

    const next = applyMoveAmongUngroupedVisibleSheets(
      ['one', 'two', 'three'],
      worksheetsById,
      'three',
      0,
    );

    expect(next).toEqual(['three', 'one', 'two']);
  });

  it('inserts before a neighbor even when grouped worksheet IDs sit between ungrouped IDs in flat order', () => {
    const worksheetsById: Record<string, WorksheetEntity> = {
      a: worksheet({ worksheetId: 'a', name: 'A', workbookOrder: 0 }),
      g1: worksheet({
        worksheetId: 'g1',
        name: 'G1',
        workbookOrder: 1,
        groupId: 'grp',
        lastKnownStructuralState: { kind: 'group', groupId: 'grp' },
      }),
      g2: worksheet({
        worksheetId: 'g2',
        name: 'G2',
        workbookOrder: 2,
        groupId: 'grp',
        lastKnownStructuralState: { kind: 'group', groupId: 'grp' },
      }),
      b: worksheet({ worksheetId: 'b', name: 'B', workbookOrder: 3 }),
      c: worksheet({ worksheetId: 'c', name: 'C', workbookOrder: 4 }),
      x: worksheet({
        worksheetId: 'x',
        name: 'X',
        workbookOrder: 5,
        groupId: null,
        lastKnownStructuralState: { kind: 'ungrouped' },
      }),
    };

    const sheetSectionOrder = ['a', 'g1', 'g2', 'b', 'c', 'x'];

    const next = applyMoveAmongUngroupedVisibleSheets(
      sheetSectionOrder,
      worksheetsById,
      'x',
      1,
    );

    expect(next).toEqual(['a', 'g1', 'g2', 'x', 'b', 'c']);
  });

  it('treats non-finite targetIndex like moveWorksheetId (NaN → insertion as 0 in ungrouped list)', () => {
    const worksheetsById: Record<string, WorksheetEntity> = {
      one: worksheet({ worksheetId: 'one', name: 'One', workbookOrder: 0 }),
      two: worksheet({ worksheetId: 'two', name: 'Two', workbookOrder: 1 }),
    };

    const next = applyMoveAmongUngroupedVisibleSheets(
      ['one', 'two'],
      worksheetsById,
      'two',
      Number.NaN,
    );

    expect(next).toEqual(['two', 'one']);
  });

  it('does not treat pinned rows as ungrouped-visible slots when projecting', () => {
    const worksheetsById: Record<string, WorksheetEntity> = {
      a: worksheet({ worksheetId: 'a', name: 'A', workbookOrder: 0 }),
      p: worksheet({
        worksheetId: 'p',
        name: 'Pinned',
        workbookOrder: 1,
        isPinned: true,
        groupId: null,
        lastKnownStructuralState: { kind: 'pinned' },
      }),
      b: worksheet({ worksheetId: 'b', name: 'B', workbookOrder: 2 }),
    };

    const next = applyMoveAmongUngroupedVisibleSheets(
      ['a', 'p', 'b'],
      worksheetsById,
      'a',
      1,
    );

    expect(next).toEqual(['b', 'p', 'a']);
  });

  it('returns reconciled order unchanged when the worksheet is not in the ungrouped-visible list', () => {
    const worksheetsById: Record<string, WorksheetEntity> = {
      a: worksheet({ worksheetId: 'a', name: 'A', workbookOrder: 0 }),
      hidden: worksheet({
        worksheetId: 'hidden',
        name: 'Hidden',
        workbookOrder: 1,
        visibility: 'Hidden',
        groupId: null,
        lastKnownStructuralState: null,
      }),
    };

    const next = applyMoveAmongUngroupedVisibleSheets(
      ['a', 'hidden'],
      worksheetsById,
      'hidden',
      0,
    );

    expect(next).toEqual(['a', 'hidden']);
  });
});
