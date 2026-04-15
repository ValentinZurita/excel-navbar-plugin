import type { WorkbookPersistenceContext, WorkbookSnapshot } from '../../domain/navigation/types';

export interface WorkbookAdapter {
  getWorkbookSnapshot(): Promise<WorkbookSnapshot>;
  getPersistenceContext(): Promise<WorkbookPersistenceContext>;
  activateWorksheet(worksheetId: string): Promise<void>;
  renameWorksheet(worksheetId: string, name: string): Promise<void>;
  unhideWorksheet(worksheetId: string): Promise<void>;
  hideWorksheet(worksheetId: string): Promise<void>;
  deleteWorksheet(worksheetId: string): Promise<void>;
}

/**
 * Error thrown when worksheet deletion fails.
 * Provides specific error codes for differentiated handling.
 */
export class WorksheetDeleteError extends Error {
  constructor(
    message: string,
    public readonly code: 'LAST_VISIBLE_SHEET' | 'WORKSHEET_NOT_FOUND' | 'UNKNOWN',
  ) {
    super(message);
    this.name = 'WorksheetDeleteError';
  }
}
