import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavigationPersistence } from '../../infrastructure/persistence/NavigationPersistence';
import { OfficeWorkbookAdapter } from '../../infrastructure/office/OfficeWorkbookAdapter';
import { toPersistedModel } from '../../domain/navigation/persistenceModel';
import { useNavigationContext } from '../../ui/navigation/NavigationProvider';

const adapter = new OfficeWorkbookAdapter();
const persistence = new NavigationPersistence();

export function useNavigationController() {
  const { state, dispatch, navigatorView } = useNavigationContext();
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const [snapshot, persistedModel] = await Promise.all([
        adapter.getWorkbookSnapshot(),
        persistence.load(),
      ]);
      dispatch({ type: 'hydrateFromWorkbook', snapshot });
      dispatch({ type: 'hydrateFromPersistence', model: persistedModel });
      hasLoaded.current = true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load workbook state.');
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
    void persistence.save(toPersistedModel(state)).catch(() => {
      // Keep the UI usable even if persistence falls back to local cache only.
    });
  }, [state]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void adapter.getWorkbookSnapshot().then((snapshot) => {
        dispatch({ type: 'hydrateFromWorkbook', snapshot });
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
    assignWorksheetToGroup(worksheetId: string, groupId: string) {
      dispatch({ type: 'assignWorksheetToGroup', worksheetId, groupId });
    },
    removeWorksheetFromGroup(worksheetId: string) {
      dispatch({ type: 'removeWorksheetFromGroup', worksheetId });
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
    errorMessage,
    ...handlers,
  };
}
