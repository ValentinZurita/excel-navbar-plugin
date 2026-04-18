import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPersistedModelFingerprint, toPersistedModel } from '../../domain/navigation/persistenceModel';
import { NavigationPersistence } from '../../infrastructure/persistence/NavigationPersistence';
import { OfficeWorkbookAdapter } from '../../infrastructure/office/OfficeWorkbookAdapter';
import { WorksheetCreateError, WorksheetDeleteError } from '../../infrastructure/office/WorkbookAdapter';
import { useNavigationContext } from '../../ui/navigation/NavigationProvider';
import type {
  BannerState,
  GroupColorToken,
  GroupEntity,
  PersistenceStatus,
  WorkbookPersistenceContext,
} from '../../domain/navigation/types';
import { WorkbookSyncCoordinator } from './WorkbookSyncCoordinator';

const adapter = new OfficeWorkbookAdapter();
const persistence = new NavigationPersistence();

export function useNavigationController() {
  const { state, dispatch, navigatorView } = useNavigationContext();
  const [isBusy, setIsBusy] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isSessionOnlyPersistence, setIsSessionOnlyPersistence] = useState(false);
  const hasLoaded = useRef(false);
  const latestStateRef = useRef(state);
  const persistenceContextRef = useRef<WorkbookPersistenceContext | null>(null);
  const latestPersistedModelRef = useRef(toPersistedModel(state));
  const syncStateRef = useRef({ inFlight: false, pendingRerun: false });

  const persistedModel = useMemo(() => toPersistedModel(state), [
    state.worksheetsById,
    state.groupsById,
    state.groupOrder,
    state.sheetSectionOrder,
    state.pinnedWorksheetOrder,
    state.hiddenSectionCollapsed,
    state.identityMode,
  ]);
  const persistedFingerprint = useMemo(
    () => createPersistedModelFingerprint(persistedModel),
    [persistedModel],
  );

  useEffect(() => {
    latestStateRef.current = state;
    latestPersistedModelRef.current = persistedModel;
  }, [persistedModel, state]);

  const applyPersistenceStatus = useCallback((status: Pick<PersistenceStatus, 'mode' | 'banner'>) => {
    setIsSessionOnlyPersistence(status.mode === 'session-only');
    setBanner(status.banner?.tone === 'info' ? null : status.banner);
  }, []);

  const resolvePersistenceContext = useCallback(async (options?: { forceRefresh?: boolean }) => {
    const shouldForceRefresh = options?.forceRefresh ?? false;
    const currentContext = persistenceContextRef.current;

    if (
      !shouldForceRefresh
      && currentContext?.mode === 'stable'
      && Boolean(currentContext.stableWorkbookKey)
    ) {
      return currentContext;
    }

    const nextContext = await adapter.getPersistenceContext();
    persistenceContextRef.current = nextContext;
    return nextContext;
  }, []);

  const performWorkbookSync = useCallback(async () => {
    const previousContext = persistenceContextRef.current;
    const [snapshot, persistenceContext] = await Promise.all([
      adapter.getWorkbookSnapshot(),
      resolvePersistenceContext(),
    ]);

    dispatch({ type: 'hydrateFromWorkbook', snapshot });

    const transitionedToStable = previousContext?.mode === 'session-only'
      && persistenceContext.mode === 'stable'
      && Boolean(persistenceContext.stableWorkbookKey);

    if (transitionedToStable) {
      const status = await persistence.save(persistenceContext, latestPersistedModelRef.current);
      applyPersistenceStatus(status);
      return;
    }

    if (persistenceContext.mode === 'session-only') {
      setIsSessionOnlyPersistence(true);
      setBanner((currentBanner) => (
        currentBanner?.tone === 'warning' || currentBanner?.tone === 'error'
          ? currentBanner
          : null
      ));
      return;
    }

    setIsSessionOnlyPersistence(false);
    setBanner((currentBanner) => (currentBanner?.tone === 'warning' ? currentBanner : null));
  }, [applyPersistenceStatus, dispatch, resolvePersistenceContext]);

  const syncFromWorkbook = useCallback(async () => {
    if (syncStateRef.current.inFlight) {
      syncStateRef.current.pendingRerun = true;
      return;
    }

    syncStateRef.current.inFlight = true;

    try {
      await performWorkbookSync();

      if (syncStateRef.current.pendingRerun) {
        syncStateRef.current.pendingRerun = false;
        await performWorkbookSync();
      }
    } finally {
      syncStateRef.current.inFlight = false;
      syncStateRef.current.pendingRerun = false;
    }
  }, [performWorkbookSync]);

  const load = useCallback(async () => {
    setIsBusy(true);
    setBanner(null);

    try {
      const [snapshot, persistenceContext] = await Promise.all([
        adapter.getWorkbookSnapshot(),
        resolvePersistenceContext({ forceRefresh: true }),
      ]);
      const { model: loadedPersistedModel, status } = await persistence.load(persistenceContext, snapshot);
      dispatch({ type: 'hydrateFromWorkbook', snapshot });
      dispatch({ type: 'hydrateFromPersistence', model: loadedPersistedModel });
      applyPersistenceStatus(status);
      hasLoaded.current = true;
    } catch (error) {
      setIsSessionOnlyPersistence(false);
      setBanner({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to load workbook state.',
      });
    } finally {
      setIsBusy(false);
    }
  }, [applyPersistenceStatus, dispatch, resolvePersistenceContext]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hasLoaded.current) {
      return;
    }

    const persistenceContext = persistenceContextRef.current;
    if (!persistenceContext) {
      return;
    }

    void persistence.save(persistenceContext, latestPersistedModelRef.current)
      .then((status) => {
        applyPersistenceStatus(status);
      })
      .catch((error) => {
        setIsSessionOnlyPersistence(false);
        setBanner({
          tone: 'warning',
          message: error instanceof Error ? error.message : 'Unable to save workbook state.',
        });
      });
  }, [applyPersistenceStatus, persistedFingerprint]);

  useEffect(() => {
    if (!hasLoaded.current) {
      return;
    }

    const intervalMs = persistenceContextRef.current?.supportsWorkbookEvents ? 15000 : 5000;
    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync: syncFromWorkbook,
      intervalMs,
    });

    void coordinator.start();

    return () => {
      void coordinator.stop();
    };
  }, [state.isReady, syncFromWorkbook]);

  const handlers = useMemo(() => ({
    setQuery(query: string) {
      dispatch({ type: 'setQuery', query });
    },
    toggleGroupCollapsed(groupId: string) {
      dispatch({ type: 'toggleGroupCollapsed', groupId });
    },
    setGroupCollapsed(groupId: string, isCollapsed: boolean) {
      dispatch({ type: 'setGroupCollapsed', groupId, isCollapsed });
    },
    toggleHiddenSection() {
      dispatch({ type: 'toggleHiddenSection' });
    },
    createGroup(name: string, colorToken: GroupColorToken, initialWorksheetId?: string) {
      dispatch({ type: 'createGroup', name, colorToken, initialWorksheetId });
    },
    renameGroup(groupId: string, name: string) {
      dispatch({ type: 'renameGroup', groupId, name });
    },
    deleteGroup(groupId: string) {
      dispatch({ type: 'deleteGroup', groupId });
    },
    restoreGroup(group: GroupEntity, worksheetId: string, orderIndex: number) {
      dispatch({ type: 'restoreGroup', group, worksheetId, orderIndex });
    },
    setGroupColor(groupId: string, colorToken: GroupColorToken) {
      dispatch({ type: 'setGroupColor', groupId, colorToken });
    },
    assignWorksheetToGroup(worksheetId: string, groupId: string, targetIndex?: number) {
      dispatch({ type: 'assignWorksheetToGroup', worksheetId, groupId, targetIndex });
    },
    removeWorksheetFromGroup(worksheetId: string, targetIndex?: number) {
      dispatch({ type: 'removeWorksheetFromGroup', worksheetId, targetIndex });
    },
    reorderGroupWorksheet(worksheetId: string, groupId: string, targetIndex: number) {
      dispatch({ type: 'reorderGroupWorksheet', worksheetId, groupId, targetIndex });
    },
    reorderSheetSectionWorksheet(worksheetId: string, targetIndex: number) {
      dispatch({ type: 'reorderSheetSectionWorksheet', worksheetId, targetIndex });
    },
    reorderPinnedWorksheet(worksheetId: string, targetIndex: number) {
      dispatch({ type: 'reorderPinnedWorksheet', worksheetId, targetIndex });
    },
    async createWorksheet() {
      try {
        setIsBusy(true);
        await adapter.createWorksheet();
        const snapshot = await adapter.getWorkbookSnapshot();
        dispatch({ type: 'hydrateFromWorkbook', snapshot });
      } catch (error) {
        if (error instanceof WorksheetCreateError) {
          setBanner({
            tone: 'error',
            message: error.message,
          });
        } else {
          setBanner({
            tone: 'error',
            message: 'Failed to create worksheet. Please try again.',
          });
        }
        throw error;
      } finally {
        setIsBusy(false);
      }
    },
    pinWorksheet(worksheetId: string) {
      dispatch({ type: 'pinWorksheet', worksheetId });
    },
    unpinWorksheet(worksheetId: string) {
      dispatch({ type: 'unpinWorksheet', worksheetId });
    },
    async activateWorksheet(worksheetId: string) {
      await adapter.activateWorksheet(worksheetId);
      dispatch({ type: 'setActiveWorksheetLocally', worksheetId });
    },
    async renameWorksheet(worksheetId: string, name: string) {
      await adapter.renameWorksheet(worksheetId, name);
      dispatch({ type: 'renameWorksheetLocally', worksheetId, name });
    },
    async unhideWorksheet(worksheetId: string) {
      await adapter.unhideWorksheet(worksheetId);
      dispatch({ type: 'markWorksheetUnhidden', worksheetId });
    },
    async hideWorksheet(worksheetId: string) {
      await adapter.hideWorksheet(worksheetId);
      dispatch({ type: 'markWorksheetHidden', worksheetId });
    },
    async deleteWorksheet(worksheetId: string) {
      try {
        setIsBusy(true);

        // 1. Execute deletion in Excel
        await adapter.deleteWorksheet(worksheetId);

        // 2. Update local state
        dispatch({ type: 'deleteWorksheet', worksheetId });

        // 3. Re-hydrate from Excel to sync state
        // (This captures changes like the new active worksheet)
        const snapshot = await adapter.getWorkbookSnapshot();
        dispatch({ type: 'hydrateFromWorkbook', snapshot });
      } catch (error) {
        // Handle specific error types with clear messages
        if (error instanceof WorksheetDeleteError) {
          setBanner({
            tone: 'error',
            message: error.message,
          });
        } else {
          setBanner({
            tone: 'error',
            message: 'Failed to delete worksheet. Please try again.',
          });
        }
        throw error; // Re-throw so caller can react
      } finally {
        setIsBusy(false);
      }
    },
    reload: load,
  }), [dispatch, load]);

  return {
    state,
    navigatorView,
    isBusy,
    banner,
    isSessionOnlyPersistence,
    ...handlers,
  };
}
