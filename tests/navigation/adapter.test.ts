import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfficeWorkbookAdapter } from '../../src/infrastructure/office/OfficeWorkbookAdapter';
import { WorksheetDeleteError } from '../../src/infrastructure/office/WorkbookAdapter';

describe('OfficeWorkbookAdapter.hideWorksheet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
    // @ts-expect-error test cleanup for globals
    delete globalThis.Excel;
  });

  it('hides a visible worksheet', async () => {
    const worksheet = { id: 'sheet-1', visibility: 'Visible' as const };
    const sync = vi.fn(async () => undefined);

    // hasOfficeRuntime() requires both globals to exist.
    globalThis.Office = {} as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: {
              items: [worksheet],
              load: vi.fn(),
            },
          },
          sync,
        };
        await callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();
    await adapter.hideWorksheet('sheet-1');

    expect(globalThis.Excel.run).toHaveBeenCalledOnce();
    expect(worksheet.visibility).toBe('Hidden');
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('does not change a VeryHidden worksheet', async () => {
    const worksheet = { id: 'sheet-1', visibility: 'VeryHidden' as const };
    const sync = vi.fn(async () => undefined);

    globalThis.Office = {} as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: {
              items: [worksheet],
              load: vi.fn(),
            },
          },
          sync,
        };
        await callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();
    await adapter.hideWorksheet('sheet-1');

    expect(globalThis.Excel.run).toHaveBeenCalledOnce();
    expect(worksheet.visibility).toBe('VeryHidden');
    expect(sync).toHaveBeenCalledTimes(1);
  });
});

describe('OfficeWorkbookAdapter.getPersistenceContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
    // @ts-expect-error test cleanup for globals
    delete globalThis.Excel;
  });

  it('returns a stable context from document.url when available', async () => {
    globalThis.Office = {
      AsyncResultStatus: { Failed: 'failed' },
      context: {
        document: {
          url: 'https://contoso.test/workbooks/finance.xlsx',
          settings: {},
        },
      },
    } as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.getPersistenceContext()).resolves.toEqual({
      documentSettingsAvailable: true,
      stableWorkbookKey: 'https://contoso.test/workbooks/finance.xlsx',
      mode: 'stable',
      source: 'document-url',
    });
  });

  it('falls back to file properties url when document.url is missing', async () => {
    globalThis.Office = {
      AsyncResultStatus: { Failed: 'failed', Succeeded: 'succeeded' },
      context: {
        document: {
          url: '',
          settings: {},
          getFilePropertiesAsync: vi.fn((callback: (result: any) => void) => {
            callback({
              status: 'succeeded',
              value: { url: 'https://contoso.test/workbooks/budget.xlsx' },
            });
          }),
        },
      },
    } as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.getPersistenceContext()).resolves.toEqual({
      documentSettingsAvailable: true,
      stableWorkbookKey: 'https://contoso.test/workbooks/budget.xlsx',
      mode: 'stable',
      source: 'file-properties-url',
    });
  });

  it('returns session-only when no stable workbook url is available', async () => {
    globalThis.Office = {
      AsyncResultStatus: { Failed: 'failed', Succeeded: 'succeeded' },
      context: {
        document: {
          url: '',
          settings: {},
          getFilePropertiesAsync: vi.fn((callback: (result: any) => void) => {
            callback({
              status: 'succeeded',
              value: { url: '' },
            });
          }),
        },
      },
    } as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.getPersistenceContext()).resolves.toEqual({
      documentSettingsAvailable: true,
      stableWorkbookKey: null,
      mode: 'session-only',
      source: 'none',
    });
  });
});

describe('OfficeWorkbookAdapter.deleteWorksheet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
    // @ts-expect-error test cleanup for globals
    delete globalThis.Excel;
  });

  it('deletes a worksheet when multiple visible sheets exist', async () => {
    const worksheets = [
      { id: 'sheet-1', visibility: 'Visible' as const, delete: vi.fn() },
      { id: 'sheet-2', visibility: 'Visible' as const, delete: vi.fn() },
    ];
    const sync = vi.fn(async () => undefined);

    globalThis.Office = {} as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: {
              items: worksheets,
              load: vi.fn(),
            },
          },
          sync,
        };
        await callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();
    await adapter.deleteWorksheet('sheet-1');

    expect(globalThis.Excel.run).toHaveBeenCalledOnce();
    expect(worksheets[0].delete).toHaveBeenCalledOnce();
    expect(worksheets[1].delete).not.toHaveBeenCalled();
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('throws WorksheetDeleteError with LAST_VISIBLE_SHEET code when deleting last visible sheet', async () => {
    const worksheets = [
      { id: 'sheet-1', visibility: 'Visible' as const, delete: vi.fn() },
      { id: 'sheet-2', visibility: 'Hidden' as const, delete: vi.fn() },
    ];
    const sync = vi.fn(async () => undefined);

    globalThis.Office = {} as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: {
              items: worksheets,
              load: vi.fn(),
            },
          },
          sync,
        };
        await callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.deleteWorksheet('sheet-1')).rejects.toThrow(WorksheetDeleteError);
    await expect(adapter.deleteWorksheet('sheet-1')).rejects.toThrow(
      'Cannot delete the last visible sheet',
    );

    try {
      await adapter.deleteWorksheet('sheet-1');
    } catch (error) {
      expect(error).toBeInstanceOf(WorksheetDeleteError);
      expect((error as WorksheetDeleteError).code).toBe('LAST_VISIBLE_SHEET');
    }

    expect(worksheets[0].delete).not.toHaveBeenCalled();
  });

  it('allows deleting a hidden sheet even if it is the last visible', async () => {
    const worksheets = [
      { id: 'sheet-1', visibility: 'Visible' as const, delete: vi.fn() },
      { id: 'sheet-2', visibility: 'Hidden' as const, delete: vi.fn() },
    ];
    const sync = vi.fn(async () => undefined);

    globalThis.Office = {} as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: {
              items: worksheets,
              load: vi.fn(),
            },
          },
          sync,
        };
        await callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();

    // Deleting the hidden sheet should succeed
    await expect(adapter.deleteWorksheet('sheet-2')).resolves.not.toThrow();
    expect(worksheets[1].delete).toHaveBeenCalledOnce();
  });

  it('throws WorksheetDeleteError with WORKSHEET_NOT_FOUND code when worksheet does not exist', async () => {
    const worksheets = [
      { id: 'sheet-1', visibility: 'Visible' as const, delete: vi.fn() },
      { id: 'sheet-2', visibility: 'Visible' as const, delete: vi.fn() },
    ];
    const sync = vi.fn(async () => undefined);

    globalThis.Office = {} as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: {
              items: worksheets,
              load: vi.fn(),
            },
          },
          sync,
        };
        await callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.deleteWorksheet('non-existent')).rejects.toThrow(WorksheetDeleteError);

    try {
      await adapter.deleteWorksheet('non-existent');
    } catch (error) {
      expect(error).toBeInstanceOf(WorksheetDeleteError);
      expect((error as WorksheetDeleteError).code).toBe('WORKSHEET_NOT_FOUND');
    }
  });

  it('succeeds in mock mode when Office runtime is not available', async () => {
    // Ensure Office/Excel are not defined
    // @ts-expect-error test setup
    globalThis.Office = undefined;
    // @ts-expect-error test setup
    globalThis.Excel = undefined;

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const adapter = new OfficeWorkbookAdapter();
    await expect(adapter.deleteWorksheet('sheet-1')).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('[Mock] Deleting worksheet:', 'sheet-1');

    consoleSpy.mockRestore();
  });
});
