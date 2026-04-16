import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PersistedNavigationModel,
  PersistenceStatus,
  WorkbookPersistenceContext,
  WorkbookSnapshot,
} from '../../src/domain/navigation/types';
import { NavigationProvider } from '../../src/ui/navigation/NavigationProvider';

const { adapterMock, persistenceMock } = vi.hoisted(() => ({
  adapterMock: {
    getWorkbookSnapshot: vi.fn(),
    getPersistenceContext: vi.fn(),
    subscribeToWorkbookChanges: vi.fn(),
    createWorksheet: vi.fn(),
    activateWorksheet: vi.fn(),
    renameWorksheet: vi.fn(),
    unhideWorksheet: vi.fn(),
    hideWorksheet: vi.fn(),
    deleteWorksheet: vi.fn(),
  },
  persistenceMock: {
    load: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/office/OfficeWorkbookAdapter', () => ({
  OfficeWorkbookAdapter: vi.fn(() => adapterMock),
}));

vi.mock('../../src/infrastructure/persistence/NavigationPersistence', () => ({
  NavigationPersistence: vi.fn(() => persistenceMock),
}));

import { useNavigationController } from '../../src/application/navigation/useNavigationController';

function wrapper({ children }: { children: ReactNode }) {
  return <NavigationProvider>{children}</NavigationProvider>;
}

function createSnapshot(overrides: Partial<WorkbookSnapshot> = {}): WorkbookSnapshot {
  return {
    worksheets: [
      {
        worksheetId: 'sheet-1',
        stableWorksheetId: 'sheet-1',
        nativeWorksheetId: 'native-sheet-1',
        name: 'Overview',
        visibility: 'Visible',
        workbookOrder: 0,
      },
    ],
    activeWorksheetId: 'sheet-1',
    identityMode: 'plugin-sheet-id',
    ...overrides,
  };
}

function createStatus(overrides: Partial<PersistenceStatus> = {}): PersistenceStatus {
  return {
    mode: 'custom-xml',
    banner: null,
    lastSource: 'none',
    diagnostics: [],
    ...overrides,
  };
}

function createContext(overrides: Partial<WorkbookPersistenceContext> = {}): WorkbookPersistenceContext {
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

describe('useNavigationController', () => {
  beforeEach(() => {
    adapterMock.getWorkbookSnapshot.mockReset();
    adapterMock.getPersistenceContext.mockReset();
    adapterMock.subscribeToWorkbookChanges.mockReset();
    persistenceMock.load.mockReset();
    persistenceMock.save.mockReset();
    adapterMock.activateWorksheet.mockReset();
    adapterMock.renameWorksheet.mockReset();
    adapterMock.unhideWorksheet.mockReset();
    adapterMock.hideWorksheet.mockReset();
    adapterMock.createWorksheet.mockReset();
    adapterMock.deleteWorksheet.mockReset();
    adapterMock.subscribeToWorkbookChanges.mockResolvedValue(async () => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks session-only persistence without surfacing an info banner', async () => {
    adapterMock.getWorkbookSnapshot.mockResolvedValue(createSnapshot());
    adapterMock.getPersistenceContext.mockResolvedValue(createContext({ stableWorkbookKey: null, mode: 'session-only', source: 'none' }));
    persistenceMock.load.mockResolvedValue({
      model: null,
      status: createStatus({
        mode: 'session-only',
        banner: {
          tone: 'info',
          message: 'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
        },
      }),
    });
    persistenceMock.save.mockResolvedValue(createStatus({
      mode: 'session-only',
      banner: {
        tone: 'info',
        message: 'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
      },
    }));

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSessionOnlyPersistence).toBe(true);
    });
    expect(result.current.banner).toBeNull();
  });

  it('shows degraded warning when canonical save fails', async () => {
    adapterMock.getWorkbookSnapshot.mockResolvedValue(createSnapshot());
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    persistenceMock.load.mockResolvedValue({
      model: createModel(),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue(createStatus({
      mode: 'degraded',
      banner: {
        tone: 'warning',
        message: 'We could not save to this workbook, but your navigation state was cached locally for this workbook on this device.',
      },
      lastSource: 'scoped-local-cache',
    }));

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await waitFor(() => {
      expect(result.current.banner?.message).toBe('We could not save to this workbook, but your navigation state was cached locally for this workbook on this device.');
    });
  });

  it('persists current state and clears the session-only banner when the workbook becomes stable', async () => {
    vi.useFakeTimers();
    adapterMock.getWorkbookSnapshot.mockResolvedValue(createSnapshot());
    adapterMock.getPersistenceContext
      .mockResolvedValue(createContext())
      .mockResolvedValueOnce(createContext({ stableWorkbookKey: null, mode: 'session-only', source: 'none' }));
    persistenceMock.load.mockResolvedValue({
      model: createModel(),
      status: createStatus({
        mode: 'session-only',
        banner: {
          tone: 'info',
          message: 'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
        },
      }),
    });
    persistenceMock.save.mockResolvedValue(createStatus({
      mode: 'custom-xml',
      banner: null,
      lastSource: 'custom-xml',
    }));
    persistenceMock.save
      .mockResolvedValueOnce(createStatus({
        mode: 'session-only',
        banner: {
          tone: 'info',
          message: 'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
        },
      }));

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.isSessionOnlyPersistence).toBe(true);
    expect(result.current.banner).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(5100);
      await Promise.resolve();
      await Promise.resolve();
      vi.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      persistenceMock.save.mock.calls.some(([context, model]) =>
        JSON.stringify(context) === JSON.stringify(createContext())
        && typeof model === 'object'
        && model !== null
        && 'schemaVersion' in model
        && model.schemaVersion === 2,
      ),
    ).toBe(true);
    expect(result.current.isSessionOnlyPersistence).toBe(false);
    expect(result.current.banner).toBeNull();
  });

  it('creates and activates worksheet by rehydrating workbook snapshot', async () => {
    adapterMock.getWorkbookSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot({
        worksheets: [
          { worksheetId: 'sheet-1', stableWorksheetId: 'sheet-1', nativeWorksheetId: 'native-sheet-1', name: 'Overview', visibility: 'Visible', workbookOrder: 0 },
          { worksheetId: 'sheet-2', stableWorksheetId: 'sheet-2', nativeWorksheetId: 'native-sheet-2', name: 'Sheet2', visibility: 'Visible', workbookOrder: 1 },
        ],
        activeWorksheetId: 'sheet-2',
      }));
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    adapterMock.createWorksheet.mockResolvedValue(undefined);
    persistenceMock.load.mockResolvedValue({
      model: createModel(),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue(createStatus());

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.isReady).toBe(true);
    });

    await act(async () => {
      await result.current.createWorksheet();
    });

    expect(adapterMock.createWorksheet).toHaveBeenCalledTimes(1);
    expect(result.current.state.activeWorksheetId).toBe('sheet-2');
    expect(result.current.state.worksheetsById['sheet-2']?.name).toBe('Sheet2');
  });
});
