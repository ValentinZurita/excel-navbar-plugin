import type { WorkbookPersistenceContext, WorkbookSnapshot } from '../../domain/navigation/types';

export interface WorksheetPreviewOptions {
  maxRows?: number;
  maxColumns?: number;
}

export type WorksheetPreviewUnavailableReason =
  | 'office-runtime-unavailable'
  | 'api-unsupported'
  | 'worksheet-not-found'
  | 'worksheet-hidden'
  | 'empty-range'
  | 'preview-failed';

export type WorksheetPreviewResult =
  | {
      status: 'ready';
      imageSrc: string;
      generatedAt: number;
    }
  | {
      status: 'unavailable';
      reason: WorksheetPreviewUnavailableReason;
      message: string;
    };

/**
 * Workbook change kinds, surfaced by `subscribeToWorkbookChanges`.
 * - `structural`: add / delete / move / rename / visibility — needs a full snapshot.
 * - `activation`: the user changed the active sheet — only the active id changed.
 */
export type WorkbookChangeKind = 'structural' | 'activation';

export interface WorkbookAdapter {
  getWorkbookSnapshot(): Promise<WorkbookSnapshot>;
  getPersistenceContext(): Promise<WorkbookPersistenceContext>;
  subscribeToWorkbookChanges?(
    listener: (kind: WorkbookChangeKind) => void,
  ): Promise<() => Promise<void> | void>;
  /**
   * Optional observer for taskpane visibility changes.
   * Emits true when taskpane is visible, false when hidden.
   */
  subscribeToVisibilityChange?(listener: (isVisible: boolean) => void): () => void;
  /**
   * Lightweight read of just the active worksheet's stable id.
   * Used as a fast path when only the active sheet changed.
   */
  getActiveWorksheetId?(): Promise<string | null>;
  getWorksheetPreview(
    worksheetId: string,
    options?: WorksheetPreviewOptions,
  ): Promise<WorksheetPreviewResult>;
  createWorksheet(): Promise<void>;
  activateWorksheet(worksheetId: string): Promise<void>;
  renameWorksheet(worksheetId: string, name: string): Promise<void>;
  unhideWorksheet(worksheetId: string): Promise<void>;
  hideWorksheet(worksheetId: string): Promise<void>;
  deleteWorksheet(worksheetId: string): Promise<void>;
}

/**
 * Error thrown when worksheet creation fails.
 */
export class WorksheetCreateError extends Error {
  constructor(
    message: string,
    public readonly code: 'CREATE_FAILED' | 'UNKNOWN',
  ) {
    super(message);
    this.name = 'WorksheetCreateError';
  }
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
