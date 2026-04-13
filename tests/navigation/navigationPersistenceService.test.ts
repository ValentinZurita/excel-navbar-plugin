import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildScopedLocalCacheKey, legacyLocalCacheKey, workbookSettingsKey } from '../../src/domain/navigation/constants';
import { NavigationPersistence } from '../../src/infrastructure/persistence/NavigationPersistence';
import type { PersistedNavigationModel, WorkbookPersistenceContext } from '../../src/domain/navigation/types';

function createModel(overrides: Partial<PersistedNavigationModel> = {}): PersistedNavigationModel {
  return {
    metadataVersion: 1,
    groups: [],
    sheetSectionOrder: [],
    pinnedWorksheetIds: [],
    hiddenSectionCollapsed: true,
    priorStructuralStateByWorksheetId: {},
    ...overrides,
  };
}

function createStableContext(overrides: Partial<WorkbookPersistenceContext> = {}): WorkbookPersistenceContext {
  return {
    documentSettingsAvailable: true,
    stableWorkbookKey: 'https://contoso.test/workbooks/finance.xlsx',
    mode: 'stable',
    source: 'document-url',
    ...overrides,
  };
}

function createSessionOnlyContext(overrides: Partial<WorkbookPersistenceContext> = {}): WorkbookPersistenceContext {
  return {
    documentSettingsAvailable: true,
    stableWorkbookKey: null,
    mode: 'session-only',
    source: 'none',
    ...overrides,
  };
}

function installOfficeSettings(options: {
  initialValue?: unknown;
  saveFails?: boolean;
}) {
  let storedValue = options.initialValue;
  const get = vi.fn((key: string) => (key === workbookSettingsKey ? storedValue : null));
  const set = vi.fn((key: string, value: unknown) => {
    if (key === workbookSettingsKey) {
      storedValue = value;
    }
  });
  const saveAsync = vi.fn((callback: (result: any) => void) => {
    if (options.saveFails) {
      callback({
        status: 'failed',
        error: { message: 'save failed' },
      });
      return;
    }

    callback({ status: 'succeeded' });
  });

  globalThis.Office = {
    AsyncResultStatus: { Failed: 'failed', Succeeded: 'succeeded' },
    context: {
      document: {
        settings: { get, set, saveAsync },
      },
    },
  } as any;

  return {
    get,
    set,
    saveAsync,
    readStoredValue: () => storedValue,
  };
}

describe('NavigationPersistence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
  });

  it('loads from document settings when a persisted model exists', async () => {
    const model = createModel({ groups: [{ groupId: 'group-1', name: 'Finance', colorToken: 'green', isCollapsed: true, worksheetOrder: [], createdAt: 1 }] });
    installOfficeSettings({ initialValue: model });
    const persistence = new NavigationPersistence();

    const result = await persistence.load(createStableContext());

    expect(result.model).toEqual(model);
    expect(result.status.lastSource).toBe('document-settings');
    expect(result.status.banner).toBeNull();
  });

  it('ignores and removes the legacy global localStorage cache key', async () => {
    const legacyModel = createModel({ groups: [{ groupId: 'legacy-group', name: 'Legacy', colorToken: 'blue', isCollapsed: true, worksheetOrder: [], createdAt: 1 }] });
    installOfficeSettings({ initialValue: null });
    window.localStorage.setItem(legacyLocalCacheKey, JSON.stringify(legacyModel));
    const persistence = new NavigationPersistence();

    const result = await persistence.load(createStableContext());

    expect(result.model).toBeNull();
    expect(window.localStorage.getItem(legacyLocalCacheKey)).toBeNull();
  });

  it('loads from workbook-scoped local cache only for the matching workbook key', async () => {
    const model = createModel({ pinnedWorksheetIds: ['sheet-1'] });
    installOfficeSettings({ initialValue: null });
    window.localStorage.setItem(buildScopedLocalCacheKey('https://contoso.test/workbooks/finance.xlsx'), JSON.stringify(model));
    window.localStorage.setItem(buildScopedLocalCacheKey('https://contoso.test/workbooks/other.xlsx'), JSON.stringify(createModel({ pinnedWorksheetIds: ['sheet-2'] })));
    const persistence = new NavigationPersistence();

    const result = await persistence.load(createStableContext());

    expect(result.model).toEqual(model);
    expect(result.status.lastSource).toBe('scoped-local-cache');
  });

  it('never reads localStorage in session-only mode', async () => {
    installOfficeSettings({ initialValue: null });
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    window.localStorage.setItem(buildScopedLocalCacheKey('https://contoso.test/workbooks/finance.xlsx'), JSON.stringify(createModel()));
    const persistence = new NavigationPersistence();

    const result = await persistence.load(createSessionOnlyContext());

    expect(result.model).toBeNull();
    expect(getItemSpy).not.toHaveBeenCalledWith(expect.stringContaining('sheetNavigator.navigation.cache::'));
    expect(result.status.mode).toBe('session-only');
  });

  it('rehydrates document settings after recovering from workbook-scoped local cache', async () => {
    const model = createModel({ sheetSectionOrder: ['sheet-2', 'sheet-1'] });
    const office = installOfficeSettings({ initialValue: null });
    window.localStorage.setItem(buildScopedLocalCacheKey('https://contoso.test/workbooks/finance.xlsx'), JSON.stringify(model));
    const persistence = new NavigationPersistence();

    await persistence.load(createStableContext());

    expect(office.set).toHaveBeenCalledWith(workbookSettingsKey, model);
    expect(office.saveAsync).toHaveBeenCalledOnce();
  });

  it('saves to document settings and workbook-scoped local cache when both are available', async () => {
    const model = createModel({ hiddenSectionCollapsed: false });
    installOfficeSettings({ initialValue: null });
    const persistence = new NavigationPersistence();

    const status = await persistence.save(createStableContext(), model);

    expect(status.mode).toBe('document+local-cache');
    expect(window.localStorage.getItem(buildScopedLocalCacheKey('https://contoso.test/workbooks/finance.xlsx'))).toBe(JSON.stringify(model));
  });

  it('returns degraded status when document settings fail but workbook-scoped cache succeeds', async () => {
    const model = createModel({ hiddenSectionCollapsed: false });
    installOfficeSettings({ initialValue: null, saveFails: true });
    const persistence = new NavigationPersistence();

    const status = await persistence.save(createStableContext(), model);

    expect(status.mode).toBe('degraded');
    expect(status.lastSource).toBe('scoped-local-cache');
    expect(status.banner?.tone).toBe('warning');
    expect(window.localStorage.getItem(buildScopedLocalCacheKey('https://contoso.test/workbooks/finance.xlsx'))).toBe(JSON.stringify(model));
  });

  it('returns degraded status without writing local cache when no stable workbook key exists', async () => {
    const model = createModel({ hiddenSectionCollapsed: false });
    installOfficeSettings({ initialValue: null, saveFails: true });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const persistence = new NavigationPersistence();

    const status = await persistence.save(createSessionOnlyContext(), model);

    expect(status.mode).toBe('degraded');
    expect(status.lastSource).toBe('none');
    expect(setItemSpy).not.toHaveBeenCalledWith(expect.stringContaining('sheetNavigator.navigation.cache::'), expect.anything());
  });
});
