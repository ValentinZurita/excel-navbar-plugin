import { describe, expect, it, vi } from 'vitest';
import { worksheetStableIdPropertyKey } from '../../src/domain/navigation/constants';
import { WorksheetIdentityRepository } from '../../src/infrastructure/office/WorksheetIdentityRepository';

function createContext() {
  return {
    sync: vi.fn(async () => undefined),
  } as unknown as Excel.RequestContext;
}

function createCustomProperty(value: string | null) {
  return {
    value: value ?? '',
    isNullObject: value === null,
    load: vi.fn(),
  };
}

function createWorksheet(nativeWorksheetId: string, stableWorksheetId: string | null) {
  const customProperty = createCustomProperty(stableWorksheetId);
  return {
    id: nativeWorksheetId,
    customProperties: {
      getItemOrNullObject: vi.fn(() => customProperty),
      add: vi.fn(),
    },
  } as unknown as Excel.Worksheet & {
    customProperties: {
      getItemOrNullObject: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
    };
  };
}

describe('WorksheetIdentityRepository', () => {
  it('loads custom properties once and reuses cached identity records', async () => {
    const context = createContext();
    const firstWorksheet = createWorksheet('native-1', 'stable-1');
    const secondWorksheet = createWorksheet('native-2', 'stable-2');
    const repository = new WorksheetIdentityRepository();

    await expect(
      repository.resolveForWorksheets(context, [firstWorksheet, secondWorksheet], true),
    ).resolves.toMatchObject({
      records: [
        { nativeWorksheetId: 'native-1', stableWorksheetId: 'stable-1' },
        { nativeWorksheetId: 'native-2', stableWorksheetId: 'stable-2' },
      ],
      identityMode: 'plugin-sheet-id',
      mutated: false,
    });
    await repository.resolveForWorksheets(context, [firstWorksheet, secondWorksheet], true);

    expect(firstWorksheet.customProperties.getItemOrNullObject).toHaveBeenCalledTimes(1);
    expect(secondWorksheet.customProperties.getItemOrNullObject).toHaveBeenCalledTimes(1);
    expect(context.sync).toHaveBeenCalledTimes(1);
  });

  it('loads custom properties only for worksheets missing from the cache', async () => {
    const context = createContext();
    const firstWorksheet = createWorksheet('native-1', 'stable-1');
    const secondWorksheet = createWorksheet('native-2', 'stable-2');
    const repository = new WorksheetIdentityRepository();

    await repository.resolveForWorksheets(context, [firstWorksheet], true);
    const result = await repository.resolveForWorksheets(
      context,
      [firstWorksheet, secondWorksheet],
      true,
    );

    expect(result.records).toEqual([
      { nativeWorksheetId: 'native-1', stableWorksheetId: 'stable-1' },
      { nativeWorksheetId: 'native-2', stableWorksheetId: 'stable-2' },
    ]);
    expect(firstWorksheet.customProperties.getItemOrNullObject).toHaveBeenCalledTimes(1);
    expect(secondWorksheet.customProperties.getItemOrNullObject).toHaveBeenCalledTimes(1);
    expect(context.sync).toHaveBeenCalledTimes(2);
  });

  it('forgets cached identities for worksheets removed from the workbook', async () => {
    const context = createContext();
    const firstWorksheet = createWorksheet('native-1', 'stable-1');
    const removedWorksheet = createWorksheet('native-2', 'stable-2');
    const readdedWorksheet = createWorksheet('native-2', 'stable-2-readded');
    const repository = new WorksheetIdentityRepository();

    await repository.resolveForWorksheets(context, [firstWorksheet, removedWorksheet], true);
    await repository.resolveForWorksheets(context, [firstWorksheet], true);
    const result = await repository.resolveForWorksheets(
      context,
      [firstWorksheet, readdedWorksheet],
      true,
    );

    expect(result.records).toEqual([
      { nativeWorksheetId: 'native-1', stableWorksheetId: 'stable-1' },
      { nativeWorksheetId: 'native-2', stableWorksheetId: 'stable-2-readded' },
    ]);
    expect(removedWorksheet.customProperties.getItemOrNullObject).toHaveBeenCalledTimes(1);
    expect(readdedWorksheet.customProperties.getItemOrNullObject).toHaveBeenCalledTimes(1);
    expect(context.sync).toHaveBeenCalledTimes(2);
  });

  it('clears cached identities when the workbook cache scope changes', async () => {
    const context = createContext();
    const firstWorkbookWorksheet = createWorksheet('native-1', 'stable-workbook-a');
    const secondWorkbookWorksheet = createWorksheet('native-1', 'stable-workbook-b');
    const repository = new WorksheetIdentityRepository();

    await repository.resolveForWorksheets(context, [firstWorkbookWorksheet], true, 'workbook-a');
    const result = await repository.resolveForWorksheets(
      context,
      [secondWorkbookWorksheet],
      true,
      'workbook-b',
    );

    expect(result.records).toEqual([
      { nativeWorksheetId: 'native-1', stableWorksheetId: 'stable-workbook-b' },
    ]);
    expect(firstWorkbookWorksheet.customProperties.getItemOrNullObject).toHaveBeenCalledTimes(1);
    expect(secondWorkbookWorksheet.customProperties.getItemOrNullObject).toHaveBeenCalledTimes(1);
    expect(context.sync).toHaveBeenCalledTimes(2);
  });

  it('creates and caches a stable identity when the worksheet property is missing', async () => {
    const context = createContext();
    const worksheet = createWorksheet('native-1', null);
    const repository = new WorksheetIdentityRepository();

    const result = await repository.resolveForWorksheets(context, [worksheet], true);

    expect(result.identityMode).toBe('plugin-sheet-id');
    expect(result.mutated).toBe(true);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].nativeWorksheetId).toBe('native-1');
    expect(result.records[0].stableWorksheetId).toMatch(/^sheetnav-/);
    expect(worksheet.customProperties.add).toHaveBeenCalledWith(
      worksheetStableIdPropertyKey,
      result.records[0].stableWorksheetId,
    );
    expect(context.sync).toHaveBeenCalledTimes(2);
  });

  it('falls back to native identities when custom properties are unsupported', async () => {
    const context = createContext();
    const worksheet = createWorksheet('native-1', 'stable-1');
    const repository = new WorksheetIdentityRepository();

    await expect(repository.resolveForWorksheets(context, [worksheet], false)).resolves.toEqual({
      records: [{ nativeWorksheetId: 'native-1', stableWorksheetId: 'native-1' }],
      identityMode: 'native-id',
      mutated: false,
    });
    expect(worksheet.customProperties.getItemOrNullObject).not.toHaveBeenCalled();
    expect(context.sync).not.toHaveBeenCalled();
  });
});
