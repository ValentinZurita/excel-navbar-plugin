import type { WorksheetEntity } from './types';
import { moveWorksheetId, reconcileSheetSectionOrder } from './utils';

/**
 * Minimal worksheet fields needed to decide whether an ID in
 * `sheetSectionOrder` occupies a “Sheets section” slot
 * (visible, not pinned, not in a group). This matches the task pane list and
 * DnD gap indices.
 */
export type SheetSectionOrderWorksheetRef = Pick<
  WorksheetEntity,
  'worksheetId' | 'workbookOrder' | 'groupId' | 'isPinned' | 'visibility'
>;

/** Mirrors `splitWorksheets` → ungrouped visible rules in `selectors.ts`. */
function isUngroupedVisibleSheetSlot(
  worksheetsById: Record<string, SheetSectionOrderWorksheetRef>,
  worksheetId: string,
): boolean {
  const worksheet = worksheetsById[worksheetId];
  return Boolean(
    worksheet
    && !worksheet.groupId
    && !worksheet.isPinned
    && worksheet.visibility === 'Visible',
  );
}

/**
 * Applies a move as if the user reordered rows in the **Sheets** section only:
 * `targetIndex` is an insertion index into the list of visible, unpinned,
 * ungrouped worksheet IDs, in `sheetSectionOrder` traversal order (same as
 * `buildNavigatorStructure` in `selectors.ts` (`ungrouped` ordering).
 *
 * Grouped, pinned, hidden, and non-visible IDs keep their relative positions in
 * the full `sheetSectionOrder` array; only the ungrouped-visible “slots” are
 * rewritten. This must be used for any action whose UI origin is that list
 * (including drag from a group into Sheets).
 */
export function applyMoveAmongUngroupedVisibleSheets(
  sheetSectionOrder: string[],
  worksheetsById: Record<string, WorksheetEntity>,
  worksheetId: string,
  targetIndex: number,
): string[] {
  const reconciled = reconcileSheetSectionOrder(sheetSectionOrder, worksheetsById);

  const ungroupedVisibleSequence = reconciled.filter((id) =>
    isUngroupedVisibleSheetSlot(worksheetsById, id),
  );

  if (!ungroupedVisibleSequence.includes(worksheetId)) {
    return reconciled;
  }

  const nextUngroupedVisibleSequence = moveWorksheetId(
    ungroupedVisibleSequence,
    worksheetId,
    targetIndex,
  );

  let slot = 0;
  const projected = reconciled.map((id) => {
    if (!isUngroupedVisibleSheetSlot(worksheetsById, id)) {
      return id;
    }

    const nextId = nextUngroupedVisibleSequence[slot];
    slot += 1;
    return nextId;
  });

  if (slot !== nextUngroupedVisibleSequence.length) {
    throw new Error(
      'applyMoveAmongUngroupedVisibleSheets: internal mismatch between ungrouped-visible slots and projected sequence.',
    );
  }

  return projected;
}
