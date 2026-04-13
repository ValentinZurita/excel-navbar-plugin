import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavigationPersistence } from '../../infrastructure/persistence/NavigationPersistence';
import { OfficeWorkbookAdapter } from '../../infrastructure/office/OfficeWorkbookAdapter';
import { toPersistedModel } from '../../domain/navigation/persistenceModel';
import { useNavigationContext } from '../../ui/navigation/NavigationProvider';
import type { BannerState, WorkbookPersistenceContext } from '../../domain/navigation/types';

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

  const load = useCallback(async () => {
    setIsBusy(true);
    setBanner(null);

    try {
      const [snapshot, persistenceContext] = await Promise.all([
        adapter.getWorkbookSnapshot(),
        adapter.getPersistenceContext(),
      ]);
      const { model: persistedModel, status } = await persistence.load(persistenceContext);
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
    const intervalId = window.setInterval(() => {
      void Promise.all([
        adapter.getWorkbookSnapshot(),
        adapter.getPersistenceContext(),
      ]).then(async ([snapshot, persistenceContext]) => {
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
      }).catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [dispatch]);

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
    createGroup(name: string, initialWorksheetId?: string) {
      dispatch({ type: 'createGroup', name, initialWorksheetId });
    },
    renameGroup(groupId: string, name: string) {
      dispatch({ type: 'renameGroup', groupId, name });
    },
    deleteGroup(groupId: string) {
      dispatch({ type: 'deleteGroup', groupId });
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
