import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeWorkbookAdapter } from '../../src/infrastructure/office/OfficeWorkbookAdapter';
import { createMockWorkbookSnapshot } from '../../src/infrastructure/office/mockWorkbookSnapshot';
import {
  WorksheetCreateError,
  WorksheetDeleteError,
} from '../../src/infrastructure/office/WorkbookAdapter';
import { mockExcelOffice } from '../helpers/mockExcelOffice';

// Type references for mock-drift detection:
// Excel.RequestContext and Excel.Worksheet are used as types in the source.
// Office.context.requirements.isSetSupported is tested below.

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

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
    globalThis.Office = mockExcelOffice() as any;
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
        return callback(context);
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

    globalThis.Office = mockExcelOffice() as any;
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
        return callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();
    await adapter.hideWorksheet('sheet-1');

    expect(globalThis.Excel.run).toHaveBeenCalledOnce();
    expect(worksheet.visibility).toBe('VeryHidden');
    expect(sync).toHaveBeenCalledTimes(1);
  });
});

describe('OfficeWorkbookAdapter.getWorkbookSnapshot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
    // @ts-expect-error test cleanup for globals
    delete globalThis.Excel;
  });

  it('returns mock snapshot when Office runtime is unavailable', async () => {
    const adapter = new OfficeWorkbookAdapter();
    await expect(adapter.getWorkbookSnapshot()).resolves.toEqual(createMockWorkbookSnapshot());
  });

  it('returns workbook metadata with stable worksheet identities', async () => {
    const firstCustomProperty = {
      value: 'stable-1',
      isNullObject: false,
      load: vi.fn(),
    };
    const secondCustomProperty = {
      value: 'stable-2',
      isNullObject: false,
      load: vi.fn(),
    };
    const firstWorksheet = {
      id: 'native-1',
      name: 'Overview',
      visibility: 'Visible' as const,
      position: 0,
      customProperties: {
        getItemOrNullObject: vi.fn(() => firstCustomProperty),
        add: vi.fn(),
      },
    };
    const secondWorksheet = {
      id: 'native-2',
      name: 'Revenue',
      visibility: 'Hidden' as const,
      position: 1,
      customProperties: {
        getItemOrNullObject: vi.fn(() => secondCustomProperty),
        add: vi.fn(),
      },
    };
    const activeWorksheet = {
      id: 'native-2',
      load: vi.fn(),
    };
    const worksheetCollection = {
      items: [firstWorksheet, secondWorksheet],
      load: vi.fn(),
      getActiveWorksheet: vi.fn(() => activeWorksheet),
    };
    const sync = vi.fn(async () => undefined);

    globalThis.Office = mockExcelOffice({
      context: {
        requirements: {
          isSetSupported: vi.fn((set: string, version: string) => {
            return set === 'ExcelApi' && version === '1.12';
          }),
        },
      },
    }) as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: worksheetCollection,
          },
          sync,
        };
        return callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.getWorkbookSnapshot()).resolves.toEqual({
      worksheets: [
        {
          worksheetId: 'stable-1',
          stableWorksheetId: 'stable-1',
          nativeWorksheetId: 'native-1',
          name: 'Overview',
          visibility: 'Visible',
          workbookOrder: 0,
        },
        {
          worksheetId: 'stable-2',
          stableWorksheetId: 'stable-2',
          nativeWorksheetId: 'native-2',
          name: 'Revenue',
          visibility: 'Hidden',
          workbookOrder: 1,
        },
      ],
      activeWorksheetId: 'stable-2',
      identityMode: 'plugin-sheet-id',
    });
    expect(worksheetCollection.load).toHaveBeenCalledWith(
      'items/id,items/name,items/visibility,items/position',
    );
    expect(activeWorksheet.load).toHaveBeenCalledWith('id');
    expect(sync).toHaveBeenCalledTimes(2);
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

  it('returns a stable context from Office.context.document.url when available', async () => {
    // Mocks Office.context.document.url
    globalThis.Office = mockExcelOffice({
      // Mocks Office.AsyncResultStatus.Failed
      AsyncResultStatus: { Failed: 'failed' },
      context: {
        document: {
          url: 'https://contoso.test/workbooks/finance.xlsx',
          settings: {},
        },
      },
    }) as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.getPersistenceContext()).resolves.toEqual({
      documentSettingsAvailable: true,
      stableWorkbookKey: 'https://contoso.test/workbooks/finance.xlsx',
      mode: 'stable',
      source: 'document-url',
      supportsCustomXml: false,
      supportsWorksheetCustomProperties: false,
      supportsWorkbookEvents: false,
    });
  });

  it('falls back to file properties url when Office.context.document.url is missing', async () => {
    // Mocks Office.context.document.getFilePropertiesAsync and Office.AsyncResultStatus.Failed
    globalThis.Office = mockExcelOffice({
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
    }) as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.getPersistenceContext()).resolves.toEqual({
      documentSettingsAvailable: true,
      stableWorkbookKey: 'https://contoso.test/workbooks/budget.xlsx',
      mode: 'stable',
      source: 'file-properties-url',
      supportsCustomXml: false,
      supportsWorksheetCustomProperties: false,
      supportsWorkbookEvents: false,
    });
  });

  it('returns session-only when no stable workbook url is available', async () => {
    globalThis.Office = mockExcelOffice({
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
    }) as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.getPersistenceContext()).resolves.toEqual({
      documentSettingsAvailable: true,
      stableWorkbookKey: null,
      mode: 'session-only',
      source: 'none',
      supportsCustomXml: false,
      supportsWorksheetCustomProperties: false,
      supportsWorkbookEvents: false,
    });
  });

  it('detects capabilities via Office.context.requirements.isSetSupported', async () => {
    const isSetSupported = vi.fn((set: string, version: string) => {
      return set === 'ExcelApi' && version === '1.17';
    });

    globalThis.Office = mockExcelOffice({
      AsyncResultStatus: { Failed: 'failed' },
      context: {
        document: {
          url: 'https://contoso.test/workbook.xlsx',
          settings: {},
        },
        requirements: {
          isSetSupported,
        },
      },
    }) as any;

    const adapter = new OfficeWorkbookAdapter();
    const context = await adapter.getPersistenceContext();

    expect(isSetSupported).toHaveBeenCalledWith('ExcelApi', '1.5');
    expect(isSetSupported).toHaveBeenCalledWith('ExcelApi', '1.12');
    expect(isSetSupported).toHaveBeenCalledWith('ExcelApi', '1.17');
    expect(context.supportsWorkbookEvents).toBe(true);
    expect(context.supportsCustomXml).toBe(false);
    expect(context.supportsWorksheetCustomProperties).toBe(false);
  });

  it('returns false capabilities when Office.context.requirements is unavailable', async () => {
    globalThis.Office = mockExcelOffice({
      AsyncResultStatus: { Failed: 'failed' },
      context: {
        document: {
          url: 'https://contoso.test/workbook.xlsx',
          settings: {},
        },
        // No requirements object
      },
    }) as any;

    const adapter = new OfficeWorkbookAdapter();
    const context = await adapter.getPersistenceContext();

    expect(context.supportsCustomXml).toBe(false);
    expect(context.supportsWorksheetCustomProperties).toBe(false);
    expect(context.supportsWorkbookEvents).toBe(false);
  });
});

describe('OfficeWorkbookAdapter.getWorksheetPreview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
    // @ts-expect-error test cleanup for globals
    delete globalThis.Excel;
  });

  it('returns api-unsupported when ExcelApi 1.7 is unavailable', async () => {
    const isSetSupported = vi.fn(() => false);

    globalThis.Office = mockExcelOffice({
      context: {
        requirements: {
          isSetSupported,
        },
      },
    }) as any;
    globalThis.Excel = {
      run: vi.fn(),
    } as any;

    const adapter = new OfficeWorkbookAdapter();
    await expect(adapter.getWorksheetPreview('sheet-1')).resolves.toEqual({
      status: 'unavailable',
      reason: 'api-unsupported',
      message: 'Unavailable in this Excel version.',
    });

    expect(isSetSupported).toHaveBeenCalledWith('ExcelApi', '1.7');
    expect(globalThis.Excel.run).not.toHaveBeenCalled();
  });

  it('returns a data image for a bounded used range', async () => {
    const imageResult = { value: 'base64-png' };
    const usedRange = {
      isNullObject: false,
      rowIndex: 2,
      columnIndex: 3,
      rowCount: 20,
      columnCount: 9,
      load: vi.fn(),
    };
    const previewRange = {
      getImage: vi.fn(() => imageResult),
    };
    const worksheet = {
      id: 'sheet-1',
      visibility: 'Visible' as const,
      getUsedRangeOrNullObject: vi.fn(() => usedRange),
      getRangeByIndexes: vi.fn(() => previewRange),
    };
    const sync = vi.fn(async () => undefined);

    globalThis.Office = mockExcelOffice({
      context: {
        requirements: {
          isSetSupported: vi.fn((set: string, version: string) => {
            return set === 'ExcelApi' && version === '1.7';
          }),
        },
      },
    }) as any;
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
        return callback(context);
      }),
    } as any;

    vi.spyOn(Date, 'now').mockReturnValue(123);

    const adapter = new OfficeWorkbookAdapter();
    await expect(adapter.getWorksheetPreview('sheet-1')).resolves.toEqual({
      status: 'ready',
      imageSrc: 'data:image/png;base64,base64-png',
      generatedAt: 123,
    });

    expect(usedRange.load).toHaveBeenCalledWith('rowIndex,columnIndex,rowCount,columnCount');
    expect(worksheet.getRangeByIndexes).toHaveBeenCalledWith(2, 3, 20, 10);
    expect(previewRange.getImage).toHaveBeenCalledOnce();
    expect(sync).toHaveBeenCalledTimes(3);
  });

  it('returns worksheet-not-found when the worksheet cannot be resolved', async () => {
    const sync = vi.fn(async () => undefined);

    globalThis.Office = mockExcelOffice({
      context: {
        requirements: {
          isSetSupported: vi.fn((set: string, version: string) => {
            return set === 'ExcelApi' && version === '1.7';
          }),
        },
      },
    }) as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: {
              items: [{ id: 'other-sheet', visibility: 'Visible' as const }],
              load: vi.fn(),
            },
          },
          sync,
        };
        return callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();
    await expect(adapter.getWorksheetPreview('sheet-1')).resolves.toEqual({
      status: 'unavailable',
      reason: 'worksheet-not-found',
      message: 'This worksheet is no longer available.',
    });
  });

  it('returns an empty worksheet preview when the sheet has no used cells', async () => {
    const imageResult = { value: 'empty-base64-png' };
    const previewRange = {
      getImage: vi.fn(() => imageResult),
    };
    const usedRange = {
      isNullObject: true,
      load: vi.fn(),
    };
    const worksheet = {
      id: 'sheet-1',
      visibility: 'Visible' as const,
      getUsedRangeOrNullObject: vi.fn(() => usedRange),
      getRangeByIndexes: vi.fn(() => previewRange),
    };
    const sync = vi.fn(async () => undefined);

    globalThis.Office = mockExcelOffice({
      context: {
        requirements: {
          isSetSupported: vi.fn((set: string, version: string) => {
            return set === 'ExcelApi' && version === '1.7';
          }),
        },
      },
    }) as any;
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
        return callback(context);
      }),
    } as any;

    vi.spyOn(Date, 'now').mockReturnValue(456);

    const adapter = new OfficeWorkbookAdapter();
    await expect(adapter.getWorksheetPreview('sheet-1')).resolves.toEqual({
      status: 'ready',
      imageSrc: 'data:image/png;base64,empty-base64-png',
      generatedAt: 456,
    });

    expect(worksheet.getRangeByIndexes).toHaveBeenCalledWith(0, 0, 20, 10);
    expect(previewRange.getImage).toHaveBeenCalledOnce();
  });

  it('captures context around a small used range instead of enlarging one cell', async () => {
    const imageResult = { value: 'single-cell-context-base64-png' };
    const usedRange = {
      isNullObject: false,
      rowIndex: 20,
      columnIndex: 10,
      rowCount: 1,
      columnCount: 1,
      load: vi.fn(),
    };
    const previewRange = {
      getImage: vi.fn(() => imageResult),
    };
    const worksheet = {
      id: 'sheet-1',
      visibility: 'Visible' as const,
      getUsedRangeOrNullObject: vi.fn(() => usedRange),
      getRangeByIndexes: vi.fn(() => previewRange),
    };
    const sync = vi.fn(async () => undefined);

    globalThis.Office = mockExcelOffice({
      context: {
        requirements: {
          isSetSupported: vi.fn((set: string, version: string) => {
            return set === 'ExcelApi' && version === '1.7';
          }),
        },
      },
    }) as any;
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
        return callback(context);
      }),
    } as any;

    vi.spyOn(Date, 'now').mockReturnValue(789);

    const adapter = new OfficeWorkbookAdapter();
    await expect(adapter.getWorksheetPreview('sheet-1')).resolves.toEqual({
      status: 'ready',
      imageSrc: 'data:image/png;base64,single-cell-context-base64-png',
      generatedAt: 789,
    });

    expect(worksheet.getRangeByIndexes).toHaveBeenCalledWith(11, 6, 20, 10);
    expect(previewRange.getImage).toHaveBeenCalledOnce();
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

    globalThis.Office = mockExcelOffice() as any;
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

    globalThis.Office = mockExcelOffice() as any;
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

    globalThis.Office = mockExcelOffice() as any;
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

    globalThis.Office = mockExcelOffice() as any;
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

describe('OfficeWorkbookAdapter.createWorksheet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
    // @ts-expect-error test cleanup for globals
    delete globalThis.Excel;
  });

  it('creates a worksheet and activates it', async () => {
    const addedWorksheet = { activate: vi.fn() };
    const add = vi.fn(() => addedWorksheet);
    const sync = vi.fn(async () => undefined);

    globalThis.Office = mockExcelOffice() as any;
    globalThis.Excel = {
      run: vi.fn(async (callback: (context: any) => Promise<void>) => {
        const context = {
          workbook: {
            worksheets: {
              add,
            },
          },
          sync,
        };
        await callback(context);
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();
    await adapter.createWorksheet();

    expect(add).toHaveBeenCalledOnce();
    expect(addedWorksheet.activate).toHaveBeenCalledOnce();
    expect(sync).toHaveBeenCalledOnce();
  });

  it('throws WorksheetCreateError when Office creation fails', async () => {
    globalThis.Office = mockExcelOffice() as any;
    globalThis.Excel = {
      run: vi.fn(async () => {
        throw new Error('Excel create failed');
      }),
    } as any;

    const adapter = new OfficeWorkbookAdapter();

    await expect(adapter.createWorksheet()).rejects.toThrow(WorksheetCreateError);

    try {
      await adapter.createWorksheet();
    } catch (error) {
      expect(error).toBeInstanceOf(WorksheetCreateError);
      expect((error as WorksheetCreateError).code).toBe('CREATE_FAILED');
    }
  });

  it('succeeds in mock mode when Office runtime is not available', async () => {
    // @ts-expect-error test setup
    globalThis.Office = undefined;
    // @ts-expect-error test setup
    globalThis.Excel = undefined;
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const adapter = new OfficeWorkbookAdapter();
    await expect(adapter.createWorksheet()).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('[Mock] Creating worksheet');
    consoleSpy.mockRestore();
  });
});
