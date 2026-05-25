import { afterEach, describe, expect, it } from 'vitest';
import {
  isOfficeHostReady,
  resetOfficeRuntimeGateForTests,
  waitForOfficeRuntime,
} from '../../src/infrastructure/office/waitForOfficeRuntime';
import { mockExcelOffice } from '../helpers/mockExcelOffice';

describe('waitForOfficeRuntime', () => {
  afterEach(() => {
    resetOfficeRuntimeGateForTests();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
    // @ts-expect-error test cleanup for globals
    delete globalThis.Excel;
  });

  it('resolves immediately when Office is unavailable', async () => {
    await expect(waitForOfficeRuntime()).resolves.toBeUndefined();
  });

  it('detects an Excel host after Office.onReady', async () => {
    globalThis.Office = mockExcelOffice({
      onReady: (callback: (info: { host: string }) => void) => {
        callback({ host: 'Excel' });
      },
    }) as typeof Office;
    globalThis.Excel = {} as typeof Excel;

    await expect(waitForOfficeRuntime()).resolves.toBeUndefined();
    expect(isOfficeHostReady()).toBe(true);
  });
});
