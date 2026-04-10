import type { WorkbookSnapshot } from '../../domain/navigation/types';

export interface WorkbookAdapter {
  getWorkbookSnapshot(): Promise<WorkbookSnapshot>;
  activateWorksheet(worksheetId: string): Promise<void>;
  renameWorksheet(worksheetId: string, name: string): Promise<void>;
  unhideWorksheet(worksheetId: string): Promise<void>;
  hideWorksheet(worksheetId: string): Promise<void>;
}
