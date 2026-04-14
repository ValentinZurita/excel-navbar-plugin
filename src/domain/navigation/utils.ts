import type { WorksheetEntity } from './types';

/**
 * Comparator for sorting worksheets by their workbook order.
 */
export function byWorkbookOrder(
  left: Pick<WorksheetEntity, 'workbookOrder'>,
  right: Pick<WorksheetEntity, 'workbookOrder'>,
): number {
  return left.workbookOrder - right.workbookOrder;
}

/**
 * Removes duplicate worksheet IDs while preserving order.
 */
export function dedupeWorksheetIds(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((worksheetId) => {
    if (seen.has(worksheetId)) {
      return false;
    }
    seen.add(worksheetId);
    return true;
  });
}

/**
 * Moves a worksheet ID to a new position within an order array.
 * Returns a new array without mutating the original.
 */
export function moveWorksheetId(
  order: string[],
  worksheetId: string,
  targetIndex: number,
): string[] {
  const nextOrder = order.filter((candidateId) => candidateId !== worksheetId);
  const clampedIndex = Math.max(0, Math.min(targetIndex, nextOrder.length));
  nextOrder.splice(clampedIndex, 0, worksheetId);
  return nextOrder;
}

/**
 * Reconciles the sheet section order with the current set of worksheets.
 * Keeps existing order for known worksheets and appends missing ones sorted by workbook order.
 */
export function reconcileSheetSectionOrder(
  currentOrder: string[],
  worksheetsById: Record<string, Pick<WorksheetEntity, 'worksheetId' | 'workbookOrder'>>,
): string[] {
  const knownWorksheetIds = new Set(Object.keys(worksheetsById));
  const kept = dedupeWorksheetIds(currentOrder).filter((worksheetId) =>
    knownWorksheetIds.has(worksheetId),
  );

  const worksheetArray = Object.values(worksheetsById);
  const missing = worksheetArray
    .sort(byWorkbookOrder)
    .map((worksheet) => worksheet.worksheetId)
    .filter((worksheetId) => !kept.includes(worksheetId));

  return [...kept, ...missing];
}
