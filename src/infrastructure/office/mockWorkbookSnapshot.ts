import type { WorkbookSnapshot } from '../../domain/navigation/types';

/**
 * Development fallback when Office runtime is unavailable.
 * Keeps navigation shell usable in non-Excel test/dev environments.
 */
export function createMockWorkbookSnapshot(): WorkbookSnapshot {
  return {
    worksheets: [
      {
        worksheetId: 'sheet-1',
        stableWorksheetId: 'sheet-1',
        nativeWorksheetId: 'sheet-1',
        name: 'Overview',
        visibility: 'Visible',
        workbookOrder: 0,
      },
      {
        worksheetId: 'sheet-2',
        stableWorksheetId: 'sheet-2',
        nativeWorksheetId: 'sheet-2',
        name: 'Revenue',
        visibility: 'Visible',
        workbookOrder: 1,
      },
      {
        worksheetId: 'sheet-3',
        stableWorksheetId: 'sheet-3',
        nativeWorksheetId: 'sheet-3',
        name: 'Archive',
        visibility: 'Hidden',
        workbookOrder: 2,
      },
    ],
    activeWorksheetId: 'sheet-1',
    identityMode: 'native-id',
  };
}
