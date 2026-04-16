import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavigationPersistence } from '../../infrastructure/persistence/NavigationPersistence';
import { OfficeWorkbookAdapter } from '../../infrastructure/office/OfficeWorkbookAdapter';
import { WorksheetCreateError, WorksheetDeleteError } from '../../infrastructure/office/WorkbookAdapter';
import { toPersistedModel } from '../../domain/navigation/persistenceModel';
import { useNavigationContext } from '../../ui/navigation/NavigationProvider';
import type { BannerState, GroupColorToken, WorkbookPersistenceContext } from '../../domain/navigation/types';
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

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const syncFromWorkbook = useCallback(async () => {
    const [snapshot, persistenceContext] = await Promise.all([
      adapter.getWorkbookSnapshot(),
      adapter.getPersistenceContext(),
    ]);
    dispatch({ type: 'hydrateFromWorkbook', snapshot });

    const previousContext = persistenceContextRef.current;
    const transitionedToStable = previousContext?.mode === 'session-only'
      && persistenceContext.mode === 'stable'
      && Boolean(persistenceContext.stableWorkbookKey);

    persistenceContextRef.current = persistenceContext;

    if (transitionedToStable) {
      const status = await persistence.save(persistenceContext, toPersistedModel(latestStateRef.current));
      setIsSessionOnlyPersistence(status.mode === 'session-only');
      setBanner(status.banner?.tone === 'info' ? null : status.banner);
      return;
    }

    if (persistenceContext.mode === 'session-only') {
      setIsSessionOnlyPersistence(true);
      setBanner((currentBanner) => (currentBanner?.tone === 'warning' || currentBanner?.tone === 'error' ? currentBanner : null));
      return;
    }

    setIsSessionOnlyPersistence(false);
    setBanner((currentBanner) => (currentBanner?.tone === 'warning' ? currentBanner : null));
  }, [dispatch]);

  const load = useCallback(async () => {
    setIsBusy(true);
    setBanner(null);

    try {
      const [snapshot, persistenceContext] = await Promise.all([
        adapter.getWorkbookSnapshot(),
        adapter.getPersistenceContext(),
      ]);
      const { model: persistedModel, status } = await persistence.load(persistenceContext, snapshot);
      dispatch({ type: 'hydrateFromWorkbook', snapshot });
      dispatch({ type: 'hydrateFromPersistence', model: persistedModel });
      persistenceContextRef.current = persistenceContext;
      setIsSessionOnlyPersistence(status.mode === 'session-only');
      setBanner(status.banner?.tone === 'info' ? null : status.banner);
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
  }, [dispatch]);

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

    void persistence.save(persistenceContext, toPersistedModel(state)).then((status) => {
      setIsSessionOnlyPersistence(status.mode === 'session-only');
      setBanner(status.banner?.tone === 'info' ? null : status.banner);
    }).catch((error) => {
      setIsSessionOnlyPersistence(false);
      setBanner({
        tone: 'warning',
        message: error instanceof Error ? error.message : 'Unable to save workbook state.',
      });
    });
  }, [state]);

  useEffect(() => {
    if (!hasLoaded.current) {
      return;
    }

    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync: syncFromWorkbook,
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
      const snapshot = await adapter.getWorkbookSnapshot();
      dispatch({ type: 'hydrateFromWorkbook', snapshot });
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
