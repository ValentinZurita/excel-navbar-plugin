import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildScopedLocalCacheKey,
  workbookSettingsFallbackKey,
  workbookSettingsKey,
} from '../../src/domain/navigation/constants';
import type {
  LegacyPersistedNavigationModel,
  PersistedNavigationModel,
  WorkbookPersistenceContext,
  WorkbookSnapshot,
} from '../../src/domain/navigation/types';
import { NavigationPersistence } from '../../src/infrastructure/persistence/NavigationPersistence';
import { CustomXmlNavigationRepository } from '../../src/infrastructure/persistence/CustomXmlNavigationRepository';

function createSnapshot(overrides: Partial<WorkbookSnapshot> = {}): WorkbookSnapshot {
  return {
    worksheets: [
      {
        worksheetId: 'stable-sheet-1',
        stableWorksheetId: 'stable-sheet-1',
        nativeWorksheetId: 'native-sheet-1',
        name: 'Overview',
        visibility: 'Visible',
        workbookOrder: 0,
      },
      {
        worksheetId: 'stable-sheet-2',
        stableWorksheetId: 'stable-sheet-2',
        nativeWorksheetId: 'native-sheet-2',
        name: 'Revenue',
        visibility: 'Visible',
        workbookOrder: 1,
      },
    ],
    activeWorksheetId: 'stable-sheet-1',
    identityMode: 'plugin-sheet-id',
    ...overrides,
  };
}

function createModel(overrides: Partial<PersistedNavigationModel> = {}): PersistedNavigationModel {
  return {
    schemaVersion: 2,
    identityMode: 'plugin-sheet-id',
    groups: [],
    sheetSectionOrder: [],
    pinnedWorksheetOrder: [],
    hiddenSectionCollapsed: true,
    priorStructuralStateByStableWorksheetId: {},
    updatedAt: 1,
    ...overrides,
  };
}

function createLegacyModel(
  overrides: Partial<LegacyPersistedNavigationModel> = {},
): LegacyPersistedNavigationModel {
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

function createStableContext(
  overrides: Partial<WorkbookPersistenceContext> = {},
): WorkbookPersistenceContext {
  return {
    documentSettingsAvailable: true,
    stableWorkbookKey: 'https://contoso.test/workbooks/finance.xlsx',
    mode: 'stable',
    source: 'document-url',
    supportsCustomXml: true,
    supportsWorksheetCustomProperties: true,
    supportsWorkbookEvents: true,
    ...overrides,
  };
}

function createSessionOnlyContext(
  overrides: Partial<WorkbookPersistenceContext> = {},
): WorkbookPersistenceContext {
  return {
    documentSettingsAvailable: true,
    stableWorkbookKey: null,
    mode: 'session-only',
    source: 'none',
    supportsCustomXml: true,
    supportsWorksheetCustomProperties: true,
    supportsWorkbookEvents: false,
    ...overrides,
  };
}

function installOfficeSettings(options: {
  initialValue?: unknown;
  initialFallbackValue?: unknown;
  saveFails?: boolean;
}) {
  const store = new Map<string, unknown>();
  store.set(workbookSettingsKey, options.initialValue ?? null);
  store.set(workbookSettingsFallbackKey, options.initialFallbackValue ?? null);

  const get = vi.fn((key: string) => store.get(key) ?? null);
  const set = vi.fn((key: string, value: unknown) => {
    store.set(key, value);
  });
  const remove = vi.fn((key: string) => {
    store.delete(key);
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
        settings: { get, set, remove, saveAsync },
      },
    },
  } as any;

  return {
    get,
    set,
    remove,
    saveAsync,
    readValue: (key: string) => store.get(key),
  };
}

describe('NavigationPersistence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    // @ts-expect-error test cleanup for globals
    delete globalThis.Office;
  });

  it('loads from Custom XML when a canonical persisted model exists', async () => {
    const model = createModel({
      groups: [
        {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'green',
          isCollapsed: true,
          worksheetOrder: [],
          createdAt: 1,
        },
      ],
    });
    vi.spyOn(CustomXmlNavigationRepository.prototype, 'load').mockResolvedValue(model);
    const persistence = new NavigationPersistence();

    const result = await persistence.load(createStableContext(), createSnapshot());

    expect(result.model).toEqual(
      expect.objectContaining({
        ...model,
        sheetSectionOrder: ['stable-sheet-1', 'stable-sheet-2'],
        updatedAt: expect.any(Number),
      }),
    );
    expect(result.status.lastSource).toBe('custom-xml');
    expect(result.status.mode).toBe('custom-xml');
  });

  it('migrates legacy settings into the canonical v2 model', async () => {
    vi.spyOn(CustomXmlNavigationRepository.prototype, 'load').mockResolvedValue(null);
    const saveSpy = vi
      .spyOn(CustomXmlNavigationRepository.prototype, 'save')
      .mockResolvedValue(undefined);
    const office = installOfficeSettings({
      initialValue: createLegacyModel({
        groups: [
          {
            groupId: 'group-1',
            name: 'Finance',
            colorToken: 'green',
            isCollapsed: true,
            worksheetOrder: ['native-sheet-2'],
            createdAt: 1,
          },
        ],
        pinnedWorksheetIds: ['native-sheet-1'],
        priorStructuralStateByWorksheetId: {
          'native-sheet-1': { kind: 'pinned' },
        },
      }),
    });
    const persistence = new NavigationPersistence();

    const result = await persistence.load(createStableContext(), createSnapshot());

    expect(result.status.lastSource).toBe('legacy-settings');
    expect(result.status.diagnostics).toContain('migrated_from_settings_v1');
    expect(result.model).toEqual(
      expect.objectContaining({
        ...createModel({
          groups: [
            {
              groupId: 'group-1',
              name: 'Finance',
              colorToken: 'green',
              isCollapsed: true,
              worksheetOrder: ['stable-sheet-2'],
              createdAt: 1,
            },
          ],
          pinnedWorksheetOrder: ['stable-sheet-1'],
          priorStructuralStateByStableWorksheetId: {
            'stable-sheet-1': { kind: 'pinned' },
          },
        }),
        sheetSectionOrder: ['stable-sheet-1', 'stable-sheet-2'],
        updatedAt: expect.any(Number),
      }),
    );
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaVersion: 2,
        pinnedWorksheetOrder: ['stable-sheet-1'],
      }),
    );
    expect(office.remove).toHaveBeenCalledWith(workbookSettingsKey);
  });

  it('recovers from workbook-scoped local cache and rehydrates the canonical store', async () => {
    const model = createModel({ pinnedWorksheetOrder: ['stable-sheet-1'] });
    vi.spyOn(CustomXmlNavigationRepository.prototype, 'load').mockResolvedValue(null);
    const saveSpy = vi
      .spyOn(CustomXmlNavigationRepository.prototype, 'save')
      .mockResolvedValue(undefined);
    installOfficeSettings({ initialValue: null });
    window.localStorage.setItem(
      buildScopedLocalCacheKey('https://contoso.test/workbooks/finance.xlsx'),
      JSON.stringify(model),
    );
    const persistence = new NavigationPersistence();

    const result = await persistence.load(createStableContext(), createSnapshot());

    expect(result.model).toEqual(
      expect.objectContaining({
        ...model,
        sheetSectionOrder: ['stable-sheet-1', 'stable-sheet-2'],
        updatedAt: expect.any(Number),
      }),
    );
    expect(result.status.lastSource).toBe('scoped-local-cache');
    expect(result.status.diagnostics).toContain('recovered_from_local_cache');
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pinnedWorksheetOrder: ['stable-sheet-1'],
      }),
    );
  });

  it('saves to settings fallback when Custom XML is unavailable', async () => {
    const model = createModel({ hiddenSectionCollapsed: false, identityMode: 'native-id' });
    const office = installOfficeSettings({ initialValue: null });
    const persistence = new NavigationPersistence();

    const status = await persistence.save(
      createStableContext({
        supportsCustomXml: false,
        supportsWorksheetCustomProperties: false,
      }),
      model,
    );

    expect(status.mode).toBe('settings-fallback');
    expect(status.lastSource).toBe('settings-fallback');
    expect(status.diagnostics).toContain('custom_xml_unavailable');
    expect(status.diagnostics).toContain('fallback_to_native_identity');
    expect(office.readValue(workbookSettingsFallbackKey)).toEqual(
      expect.objectContaining({
        schemaVersion: 2,
        hiddenSectionCollapsed: false,
      }),
    );
  });

  it('returns degraded status when canonical save fails but workbook-scoped cache succeeds', async () => {
    vi.spyOn(CustomXmlNavigationRepository.prototype, 'save').mockRejectedValue(
      new Error('custom xml save failed'),
    );
    installOfficeSettings({ initialValue: null });
    const persistence = new NavigationPersistence();

    const status = await persistence.save(
      createStableContext(),
      createModel({ hiddenSectionCollapsed: false }),
    );

    expect(status.mode).toBe('degraded');
    expect(status.lastSource).toBe('scoped-local-cache');
    expect(
      window.localStorage.getItem(
        buildScopedLocalCacheKey('https://contoso.test/workbooks/finance.xlsx'),
      ),
    ).toEqual(expect.stringContaining('"schemaVersion":2'));
  });

  it('keeps session-only status when no stable workbook key exists', async () => {
    vi.spyOn(CustomXmlNavigationRepository.prototype, 'load').mockResolvedValue(null);
    installOfficeSettings({ initialValue: null });
    const persistence = new NavigationPersistence();

    const result = await persistence.load(createSessionOnlyContext(), createSnapshot());

    expect(result.model).toBeNull();
    expect(result.status.mode).toBe('session-only');
  });
});
