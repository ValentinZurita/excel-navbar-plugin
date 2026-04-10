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
