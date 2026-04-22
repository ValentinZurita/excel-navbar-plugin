import type {
  NavigationIdentityMode,
  WorkbookCapabilities,
  WorkbookPersistenceContext,
  WorkbookSnapshot,
  WorksheetVisibility,
} from '../../domain/navigation/types';
import type { WorkbookAdapter } from './WorkbookAdapter';
import { WorksheetCreateError, WorksheetDeleteError } from './WorkbookAdapter';
import { createMockWorkbookSnapshot } from './mockWorkbookSnapshot';
import { WorksheetIdentityRepository } from './WorksheetIdentityRepository';

const worksheetIdentityRepository = new WorksheetIdentityRepository();

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

function getWorkbookCapabilities(): WorkbookCapabilities {
  const supports = typeof Office !== 'undefined' && typeof Office.context?.requirements?.isSetSupported === 'function'
    ? Office.context.requirements.isSetSupported.bind(Office.context.requirements)
    : null;

  return {
    supportsCustomXml: Boolean(supports?.('ExcelApi', '1.5')),
    supportsWorksheetCustomProperties: Boolean(supports?.('ExcelApi', '1.12')),
    supportsWorkbookEvents: Boolean(supports?.('ExcelApi', '1.17')),
  };
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

async function loadWorksheets(
  context: Excel.RequestContext,
  supportsWorksheetCustomProperties: boolean,
): Promise<{
  worksheets: Excel.Worksheet[];
  identityMode: NavigationIdentityMode;
  stableWorksheetIdByNativeId: Map<string, string>;
}> {
  const worksheetCollection = context.workbook.worksheets;
  worksheetCollection.load('items/id,items/name,items/visibility,items/position');
  await context.sync();

  const { records, identityMode } = await worksheetIdentityRepository.resolveForWorksheets(
    context,
    worksheetCollection.items,
    supportsWorksheetCustomProperties,
  );

  return {
    worksheets: worksheetCollection.items,
    identityMode,
    stableWorksheetIdByNativeId: new Map(records.map((record) => [record.nativeWorksheetId, record.stableWorksheetId])),
  };
}

export class OfficeWorkbookAdapter implements WorkbookAdapter {
  async getWorkbookSnapshot(): Promise<WorkbookSnapshot> {
    if (!hasOfficeRuntime()) {
      return createMockWorkbookSnapshot();
    }

    const capabilities = getWorkbookCapabilities();

    return Excel.run(async (context) => {
      const { worksheets, identityMode, stableWorksheetIdByNativeId } = await loadWorksheets(
        context,
        capabilities.supportsWorksheetCustomProperties,
      );

      const activeWorksheet = context.workbook.worksheets.getActiveWorksheet();
      activeWorksheet.load('id');
      await context.sync();

      return {
        worksheets: worksheets.map((worksheet) => {
          const stableWorksheetId = stableWorksheetIdByNativeId.get(worksheet.id) ?? worksheet.id;
          return {
            worksheetId: stableWorksheetId,
            stableWorksheetId,
            nativeWorksheetId: worksheet.id,
            name: worksheet.name,
            visibility: worksheet.visibility as WorksheetVisibility,
            workbookOrder: worksheet.position,
          };
        }),
        activeWorksheetId: stableWorksheetIdByNativeId.get(activeWorksheet.id) ?? activeWorksheet.id,
        identityMode,
      };
    });
  }

  async getPersistenceContext(): Promise<WorkbookPersistenceContext> {
    const documentSettingsAvailable = typeof Office !== 'undefined' && Boolean(Office.context?.document?.settings);
    const capabilities = getWorkbookCapabilities();
    const documentUrl = getDocumentUrl();
    if (documentUrl) {
      return {
        documentSettingsAvailable,
        stableWorkbookKey: documentUrl,
        mode: 'stable',
        source: 'document-url',
        ...capabilities,
      };
    }

    const filePropertiesUrl = await getFilePropertiesUrl();
    if (filePropertiesUrl) {
      return {
        documentSettingsAvailable,
        stableWorkbookKey: filePropertiesUrl,
        mode: 'stable',
        source: 'file-properties-url',
        ...capabilities,
      };
    }

    return {
      documentSettingsAvailable,
      stableWorkbookKey: null,
      mode: 'session-only',
      source: 'none',
      ...capabilities,
    };
  }

  async subscribeToWorkbookChanges(listener: () => void): Promise<() => Promise<void>> {
    if (!hasOfficeRuntime() || !getWorkbookCapabilities().supportsWorkbookEvents) {
      return async () => undefined;
    }

    return Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      const handlers = [
        worksheets.onAdded.add(async () => { listener(); }),
        worksheets.onDeleted.add(async () => { listener(); }),
        worksheets.onActivated.add(async () => { listener(); }),
        worksheets.onMoved.add(async () => { listener(); }),
        worksheets.onNameChanged.add(async () => { listener(); }),
        worksheets.onVisibilityChanged.add(async () => { listener(); }),
      ];
      await context.sync();

      return async () => {
        handlers.forEach((handler) => handler.remove());
        await context.sync();
      };
    });
  }

  async createWorksheet(): Promise<void> {
    if (!hasOfficeRuntime()) {
      console.warn('[Mock] Creating worksheet');
      return;
    }

    try {
      await Excel.run(async (context) => {
        const worksheet = context.workbook.worksheets.add();
        worksheet.activate();
        await context.sync();
      });
    } catch (error) {
      throw new WorksheetCreateError(
        error instanceof Error ? error.message : 'Failed to create worksheet.',
        'CREATE_FAILED',
      );
    }
  }

  private async withResolvedWorksheet<T>(
    stableWorksheetId: string,
    loader: string,
    handler: (worksheet: Excel.Worksheet, context: Excel.RequestContext) => Promise<T>,
  ): Promise<T | undefined> {
    if (!hasOfficeRuntime()) {
      return undefined;
    }

    const { supportsWorksheetCustomProperties } = getWorkbookCapabilities();

    return Excel.run(async (context) => {
      const worksheetCollection = context.workbook.worksheets;
      worksheetCollection.load(loader);
      await context.sync();

      let targetWorksheet = worksheetCollection.items.find((candidate) => candidate.id === stableWorksheetId) ?? null;

      if (!targetWorksheet && supportsWorksheetCustomProperties) {
        const nativeWorksheetId = await worksheetIdentityRepository.resolveNativeWorksheetId(
          context,
          worksheetCollection.items,
          stableWorksheetId,
          supportsWorksheetCustomProperties,
        );

        if (nativeWorksheetId) {
          targetWorksheet = worksheetCollection.items.find((candidate) => candidate.id === nativeWorksheetId) ?? null;
        }
      }

      if (!targetWorksheet) {
        return undefined;
      }

      return handler(targetWorksheet, context);
    });
  }

  async activateWorksheet(worksheetId: string): Promise<void> {
    await this.withResolvedWorksheet(worksheetId, 'items/id', async (worksheet, context) => {
      worksheet.activate();
      await context.sync();
    });
  }

  async renameWorksheet(worksheetId: string, name: string): Promise<void> {
    await this.withResolvedWorksheet(worksheetId, 'items/id,items/name', async (worksheet, context) => {
      worksheet.name = name;
      await context.sync();
    });
  }

  async unhideWorksheet(worksheetId: string): Promise<void> {
    await this.withResolvedWorksheet(worksheetId, 'items/id,items/visibility', async (worksheet, context) => {
      if (worksheet.visibility === 'VeryHidden') {
        return;
      }

      worksheet.visibility = 'Visible';
      await context.sync();
    });
  }

  async hideWorksheet(worksheetId: string): Promise<void> {
    await this.withResolvedWorksheet(worksheetId, 'items/id,items/visibility', async (worksheet, context) => {
      if (worksheet.visibility === 'VeryHidden') {
        return;
      }

      worksheet.visibility = 'Hidden';
      await context.sync();
    });
  }

  async deleteWorksheet(worksheetId: string): Promise<void> {
    if (!hasOfficeRuntime()) {
      console.warn('[Mock] Deleting worksheet:', worksheetId);
      return;
    }

    const { supportsWorksheetCustomProperties } = getWorkbookCapabilities();

    return Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load('items/id,items/visibility');
      await context.sync();

      let targetWorksheet = worksheets.items.find((candidate) => candidate.id === worksheetId) ?? null;

      if (!targetWorksheet && supportsWorksheetCustomProperties) {
        const nativeWorksheetId = await worksheetIdentityRepository.resolveNativeWorksheetId(
          context,
          worksheets.items,
          worksheetId,
          supportsWorksheetCustomProperties,
        );

        if (nativeWorksheetId) {
          targetWorksheet = worksheets.items.find((candidate) => candidate.id === nativeWorksheetId) ?? null;
        }
      }

      if (!targetWorksheet) {
        throw new WorksheetDeleteError(
          'Worksheet not found',
          'WORKSHEET_NOT_FOUND',
        );
      }

      const visibleSheets = worksheets.items.filter((worksheet) => worksheet.visibility === 'Visible');

      if (visibleSheets.length <= 1 && targetWorksheet.visibility === 'Visible') {
        throw new WorksheetDeleteError(
          'Cannot delete the last visible sheet. Excel requires at least one visible sheet.',
          'LAST_VISIBLE_SHEET',
        );
      }

      targetWorksheet.delete();
      await context.sync();
    });
  }
}
