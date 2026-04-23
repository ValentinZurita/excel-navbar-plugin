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

function createContext(
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

function createGroupedModel(groupId: string, worksheetOrder: string[]): PersistedNavigationModel {
  return createModel({
    groups: [
      {
        groupId,
        name: 'Finance',
        colorToken: 'blue',
        isCollapsed: false,
        worksheetOrder,
        createdAt: 1,
      },
    ],
  });
}

function createDeferred<T>() {
  let resolvePromise!: (value: T | PromiseLike<T>) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
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
    adapterMock.getPersistenceContext.mockResolvedValue(
      createContext({ stableWorkbookKey: null, mode: 'session-only', source: 'none' }),
    );
    persistenceMock.load.mockResolvedValue({
      model: null,
      status: createStatus({
        mode: 'session-only',
        banner: {
          tone: 'info',
          message:
            'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
        },
      }),
    });
    persistenceMock.save.mockResolvedValue({
      status: createStatus({
        mode: 'session-only',
        banner: {
          tone: 'info',
          message:
            'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
        },
      }),
      savedUpdatedAt: 1,
    });

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
    persistenceMock.save.mockResolvedValue({
      status: createStatus({
        mode: 'degraded',
        banner: {
          tone: 'warning',
          message:
            'We could not save to this workbook, but your navigation state was cached locally for this workbook on this device.',
        },
        lastSource: 'scoped-local-cache',
      }),
      savedUpdatedAt: 1,
    });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await waitFor(() => {
      expect(result.current.banner?.message).toBe(
        'We could not save to this workbook, but your navigation state was cached locally for this workbook on this device.',
      );
    });
  });

  it('persists current state and clears the session-only banner when the workbook becomes stable', async () => {
    vi.useFakeTimers();
    adapterMock.getWorkbookSnapshot.mockResolvedValue(createSnapshot());
    adapterMock.getPersistenceContext
      .mockResolvedValue(createContext())
      .mockResolvedValueOnce(
        createContext({ stableWorkbookKey: null, mode: 'session-only', source: 'none' }),
      );
    persistenceMock.load.mockResolvedValue({
      model: createModel(),
      status: createStatus({
        mode: 'session-only',
        banner: {
          tone: 'info',
          message:
            'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
        },
      }),
    });
    persistenceMock.save.mockResolvedValue({
      status: createStatus({
        mode: 'custom-xml',
        banner: null,
        lastSource: 'custom-xml',
      }),
      savedUpdatedAt: 1,
    });
    persistenceMock.save.mockResolvedValueOnce({
      status: createStatus({
        mode: 'session-only',
        banner: {
          tone: 'info',
          message:
            'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
        },
      }),
      savedUpdatedAt: 1,
    });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.isSessionOnlyPersistence).toBe(true);
    expect(result.current.banner).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(15100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      persistenceMock.save.mock.calls.some(
        ([context, model]) =>
          JSON.stringify(context) === JSON.stringify(createContext()) &&
          typeof model === 'object' &&
          model !== null &&
          'schemaVersion' in model &&
          model.schemaVersion === 2,
      ),
    ).toBe(true);
    expect(result.current.isSessionOnlyPersistence).toBe(false);
    expect(result.current.banner).toBeNull();
  });

  it('creates and activates worksheet by rehydrating workbook snapshot', async () => {
    adapterMock.getWorkbookSnapshot.mockResolvedValueOnce(createSnapshot()).mockResolvedValueOnce(
      createSnapshot({
        worksheets: [
          {
            worksheetId: 'sheet-1',
            stableWorksheetId: 'sheet-1',
            nativeWorksheetId: 'native-sheet-1',
            name: 'Overview',
            visibility: 'Visible',
            workbookOrder: 0,
          },
          {
            worksheetId: 'sheet-2',
            stableWorksheetId: 'sheet-2',
            nativeWorksheetId: 'native-sheet-2',
            name: 'Sheet2',
            visibility: 'Visible',
            workbookOrder: 1,
          },
        ],
        activeWorksheetId: 'sheet-2',
      }),
    );
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    adapterMock.createWorksheet.mockResolvedValue(undefined);
    persistenceMock.load.mockResolvedValue({
      model: createModel(),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 1 });

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

  it('does not persist again when only the search query changes', async () => {
    adapterMock.getWorkbookSnapshot.mockResolvedValue(createSnapshot());
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    persistenceMock.load.mockResolvedValue({
      model: createModel(),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 1 });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.isReady).toBe(true);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const saveCallCount = persistenceMock.save.mock.calls.length;

    act(() => {
      result.current.setQuery('rev');
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(persistenceMock.save).toHaveBeenCalledTimes(saveCallCount);
  });

  it('does not persist again when only the active worksheet changes', async () => {
    const initialSnapshot = createSnapshot({
      worksheets: [
        {
          worksheetId: 'sheet-1',
          stableWorksheetId: 'sheet-1',
          nativeWorksheetId: 'native-sheet-1',
          name: 'Overview',
          visibility: 'Visible',
          workbookOrder: 0,
        },
        {
          worksheetId: 'sheet-2',
          stableWorksheetId: 'sheet-2',
          nativeWorksheetId: 'native-sheet-2',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 1,
        },
      ],
      activeWorksheetId: 'sheet-1',
    });

    adapterMock.getWorkbookSnapshot.mockResolvedValue(initialSnapshot);
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    adapterMock.activateWorksheet.mockResolvedValue(undefined);
    persistenceMock.load.mockResolvedValue({
      model: createModel({ sheetSectionOrder: ['sheet-1', 'sheet-2'] }),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 1 });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.isReady).toBe(true);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const saveCallCount = persistenceMock.save.mock.calls.length;

    await act(async () => {
      await result.current.activateWorksheet('sheet-2');
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(adapterMock.activateWorksheet).toHaveBeenCalledWith('sheet-2');
    expect(result.current.state.activeWorksheetId).toBe('sheet-2');
    expect(adapterMock.getWorkbookSnapshot).toHaveBeenCalledTimes(1);
    expect(persistenceMock.save).toHaveBeenCalledTimes(saveCallCount);
  });

  it('does not change the active worksheet locally when activation fails', async () => {
    const initialSnapshot = createSnapshot({
      worksheets: [
        {
          worksheetId: 'sheet-1',
          stableWorksheetId: 'sheet-1',
          nativeWorksheetId: 'native-sheet-1',
          name: 'Overview',
          visibility: 'Visible',
          workbookOrder: 0,
        },
        {
          worksheetId: 'sheet-2',
          stableWorksheetId: 'sheet-2',
          nativeWorksheetId: 'native-sheet-2',
          name: 'Revenue',
          visibility: 'Visible',
          workbookOrder: 1,
        },
      ],
      activeWorksheetId: 'sheet-1',
    });

    adapterMock.getWorkbookSnapshot.mockResolvedValue(initialSnapshot);
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    adapterMock.activateWorksheet.mockRejectedValue(new Error('Activation failed'));
    persistenceMock.load.mockResolvedValue({
      model: createModel({ sheetSectionOrder: ['sheet-1', 'sheet-2'] }),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 1 });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.isReady).toBe(true);
    });

    await expect(result.current.activateWorksheet('sheet-2')).rejects.toThrow('Activation failed');
    expect(result.current.state.activeWorksheetId).toBe('sheet-1');
    expect(adapterMock.getWorkbookSnapshot).toHaveBeenCalledTimes(1);
  });

  it('reuses stable persistence context for polling syncs', async () => {
    vi.useFakeTimers();
    adapterMock.getWorkbookSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot());
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    persistenceMock.load.mockResolvedValue({
      model: createModel(),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 1 });

    renderHook(() => useNavigationController(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(adapterMock.getPersistenceContext).toHaveBeenCalledTimes(1);
  });

  it('coalesces overlapping polling and workbook events into a single rerun', async () => {
    vi.useFakeTimers();
    const deferredSnapshot = createDeferred<WorkbookSnapshot>();
    let workbookChangeListener: (() => void) | null = null;

    adapterMock.subscribeToWorkbookChanges.mockImplementation(async (listener: () => void) => {
      workbookChangeListener = listener;
      return async () => undefined;
    });
    adapterMock.getWorkbookSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockImplementationOnce(() => deferredSnapshot.promise)
      .mockResolvedValue(createSnapshot());
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    persistenceMock.load.mockResolvedValue({
      model: createModel(),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 1 });

    renderHook(() => useNavigationController(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(workbookChangeListener).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
    });

    expect(adapterMock.getWorkbookSnapshot).toHaveBeenCalledTimes(2);

    act(() => {
      workbookChangeListener?.();
      workbookChangeListener?.();
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(adapterMock.getWorkbookSnapshot).toHaveBeenCalledTimes(2);

    await act(async () => {
      deferredSnapshot.resolve(createSnapshot());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(adapterMock.getWorkbookSnapshot).toHaveBeenCalledTimes(3);
  });

  it('deletes grouped worksheets with one workbook rehydrate after loop', async () => {
    adapterMock.getWorkbookSnapshot
      .mockResolvedValueOnce(
        createSnapshot({
          worksheets: [
            {
              worksheetId: 'sheet-1',
              stableWorksheetId: 'sheet-1',
              nativeWorksheetId: 'native-sheet-1',
              name: 'Overview',
              visibility: 'Visible',
              workbookOrder: 0,
            },
            {
              worksheetId: 'sheet-2',
              stableWorksheetId: 'sheet-2',
              nativeWorksheetId: 'native-sheet-2',
              name: 'Revenue',
              visibility: 'Visible',
              workbookOrder: 1,
            },
            {
              worksheetId: 'sheet-3',
              stableWorksheetId: 'sheet-3',
              nativeWorksheetId: 'native-sheet-3',
              name: 'Backlog',
              visibility: 'Visible',
              workbookOrder: 2,
            },
          ],
          activeWorksheetId: 'sheet-1',
        }),
      )
      .mockResolvedValueOnce(
        createSnapshot({
          worksheets: [
            {
              worksheetId: 'sheet-3',
              stableWorksheetId: 'sheet-3',
              nativeWorksheetId: 'native-sheet-3',
              name: 'Backlog',
              visibility: 'Visible',
              workbookOrder: 0,
            },
          ],
          activeWorksheetId: 'sheet-3',
        }),
      );
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    adapterMock.deleteWorksheet.mockResolvedValue(undefined);
    persistenceMock.load.mockResolvedValue({
      model: createGroupedModel('group-1', ['sheet-1', 'sheet-2']),
      status: createStatus(),
    });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 1 });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.isReady).toBe(true);
    });

    await act(async () => {
      await result.current.deleteGroupAndWorksheets('group-1');
    });

    expect(adapterMock.deleteWorksheet).toHaveBeenCalledTimes(2);
    expect(adapterMock.deleteWorksheet).toHaveBeenNthCalledWith(1, 'sheet-1');
    expect(adapterMock.deleteWorksheet).toHaveBeenNthCalledWith(2, 'sheet-2');
    expect(adapterMock.getWorkbookSnapshot).toHaveBeenCalledTimes(2);
    expect(result.current.state.worksheetsById['sheet-1']).toBeUndefined();
    expect(result.current.state.worksheetsById['sheet-2']).toBeUndefined();
    expect(result.current.state.activeWorksheetId).toBe('sheet-3');
  });

  it('reloads persisted model during sync when another instance wrote a newer model', async () => {
    vi.useFakeTimers();
    const newerModel = createGroupedModel('group-remote', ['sheet-1']);
    newerModel.updatedAt = 9999;

    adapterMock.getWorkbookSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot());
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    persistenceMock.load
      .mockResolvedValueOnce({ model: createModel(), status: createStatus() })
      .mockResolvedValueOnce({ model: newerModel, status: createStatus() });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 100 });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(persistenceMock.load).toHaveBeenCalledTimes(2);
    expect(result.current.state.groupsById['group-remote']).toBeDefined();
    expect(result.current.state.groupOrder).toContain('group-remote');
  });

  it('does not reload persisted model during sync while busy', async () => {
    vi.useFakeTimers();
    const newerModel = createGroupedModel('group-remote', ['sheet-1']);
    newerModel.updatedAt = 9999;

    adapterMock.getWorkbookSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot());
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    adapterMock.createWorksheet.mockImplementation(() => new Promise(() => {}));
    persistenceMock.load
      .mockResolvedValueOnce({ model: createModel(), status: createStatus() })
      .mockResolvedValueOnce({ model: newerModel, status: createStatus() });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 100 });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Start an operation that leaves isBusy = true
    void result.current.createWorksheet();

    // Wait for isBusy to flip inside React before advancing timers
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isBusy).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(persistenceMock.load).toHaveBeenCalledTimes(2);
    expect(result.current.state.groupsById['group-remote']).toBeUndefined();
  });

  it('does not reload persisted model during sync while searching', async () => {
    vi.useFakeTimers();
    const newerModel = createGroupedModel('group-remote', ['sheet-1']);
    newerModel.updatedAt = 9999;

    adapterMock.getWorkbookSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot());
    adapterMock.getPersistenceContext.mockResolvedValue(createContext());
    persistenceMock.load
      .mockResolvedValueOnce({ model: createModel(), status: createStatus() })
      .mockResolvedValueOnce({ model: newerModel, status: createStatus() });
    persistenceMock.save.mockResolvedValue({ status: createStatus(), savedUpdatedAt: 100 });

    const { result } = renderHook(() => useNavigationController(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      result.current.setQuery('find');
    });

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(persistenceMock.load).toHaveBeenCalledTimes(2);
    expect(result.current.state.groupsById['group-remote']).toBeUndefined();
  });
});
