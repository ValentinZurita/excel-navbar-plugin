import type { WorkbookSnapshot, WorksheetVisibility } from '../../domain/navigation/types';
import type { WorkbookAdapter } from './WorkbookAdapter';


export function hasOfficeRuntime() {
  return typeof Office !== 'undefined' && typeof Excel !== 'undefined';
}

export class OfficeWorkbookAdapter implements WorkbookAdapter {
  async getWorkbookSnapshot(): Promise<WorkbookSnapshot> {
    if (!hasOfficeRuntime()) {
      return {
        worksheets: [
          { worksheetId: 'sheet-1', name: 'Overview', visibility: 'Visible', workbookOrder: 0 },
          { worksheetId: 'sheet-2', name: 'Revenue', visibility: 'Visible', workbookOrder: 1 },
          { worksheetId: 'sheet-3', name: 'Archive', visibility: 'Hidden', workbookOrder: 2 },
        ],
        activeWorksheetId: 'sheet-1',
      };
    }

    return Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load('items/id,items/name,items/visibility,items/position');
      const activeWorksheet = worksheets.getActiveWorksheet();
      activeWorksheet.load('id');
      await context.sync();

      return {
        worksheets: worksheets.items.map((worksheet) => ({
          worksheetId: worksheet.id,
          name: worksheet.name,
          visibility: worksheet.visibility as WorksheetVisibility,
          workbookOrder: worksheet.position,
        })),
        activeWorksheetId: activeWorksheet.id,
      };
    });
  }

  async activateWorksheet(worksheetId: string): Promise<void> {
    if (!hasOfficeRuntime()) {
      return;
    }

    await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load('items/id');
      await context.sync();
      const worksheet = worksheets.items.find((candidate) => candidate.id === worksheetId);
      if (!worksheet) {
        return;
      }
      worksheet.activate();
      await context.sync();
    });
  }

  async renameWorksheet(worksheetId: string, name: string): Promise<void> {
    if (!hasOfficeRuntime()) {
      return;
    }

    await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load('items/id');
      await context.sync();
      const worksheet = worksheets.items.find((candidate) => candidate.id === worksheetId);
      if (!worksheet) {
        return;
      }
      worksheet.name = name;
      await context.sync();
    });
  }

  async unhideWorksheet(worksheetId: string): Promise<void> {
    if (!hasOfficeRuntime()) {
      return;
    }

    await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load('items/id,items/visibility');
      await context.sync();
      const worksheet = worksheets.items.find((candidate) => candidate.id === worksheetId);
      if (!worksheet || worksheet.visibility === 'VeryHidden') {
        return;
      }
      worksheet.visibility = 'Visible';
      await context.sync();
    });
  }

  async hideWorksheet(worksheetId: string): Promise<void> {
    if (!hasOfficeRuntime()) {
      return;
    }

    await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load('items/id,items/visibility');
      await context.sync();
      const worksheet = worksheets.items.find((candidate) => candidate.id === worksheetId);
      if (!worksheet || worksheet.visibility === 'VeryHidden') {
        return;
      }
      worksheet.visibility = 'Hidden';
      await context.sync();
    });
  }
}
