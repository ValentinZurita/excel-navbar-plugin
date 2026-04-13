import type { WorkbookPersistenceContext, WorkbookSnapshot, WorksheetVisibility } from '../../domain/navigation/types';
import type { WorkbookAdapter } from './WorkbookAdapter';

export function hasOfficeRuntime() {
  return typeof Office !== 'undefined' && typeof Excel !== 'undefined';
}

function hasOfficeDocument() {
  return typeof Office !== 'undefined' && Boolean(Office.context?.document);
}

function normalizeWorkbookUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getDocumentUrl(): string | null {
  if (!hasOfficeDocument()) {
    return null;
  }

  return normalizeWorkbookUrl(Office.context.document.url);
}

async function getFilePropertiesUrl(): Promise<string | null> {
  if (!hasOfficeDocument() || typeof Office.context.document.getFilePropertiesAsync !== 'function') {
    return null;
  }

  return new Promise<string | null>((resolve) => {
    Office.context.document.getFilePropertiesAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        resolve(null);
        return;
      }

      resolve(normalizeWorkbookUrl(result.value?.url));
    });
  });
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

  async getPersistenceContext(): Promise<WorkbookPersistenceContext> {
    const documentSettingsAvailable = typeof Office !== 'undefined' && Boolean(Office.context?.document?.settings);
    const documentUrl = getDocumentUrl();
    if (documentUrl) {
      return {
        documentSettingsAvailable,
        stableWorkbookKey: documentUrl,
        mode: 'stable',
        source: 'document-url',
      };
    }

    const filePropertiesUrl = await getFilePropertiesUrl();
    if (filePropertiesUrl) {
      return {
        documentSettingsAvailable,
        stableWorkbookKey: filePropertiesUrl,
        mode: 'stable',
        source: 'file-properties-url',
      };
    }

    return {
      documentSettingsAvailable,
      stableWorkbookKey: null,
      mode: 'session-only',
      source: 'none',
    };
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
