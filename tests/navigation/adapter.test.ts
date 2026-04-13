import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfficeWorkbookAdapter } from '../../src/infrastructure/office/OfficeWorkbookAdapter';

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
