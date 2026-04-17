import { createContext, useContext, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { createDefaultNavigationState } from '../../domain/navigation/defaultState';
import { buildNavigatorStructure, buildSearchResults } from '../../domain/navigation/selectors';
import { navigationReducer } from '../../domain/navigation/reducer';
import type { NavigationAction } from '../../domain/navigation/reducer';
import type { NavigationState, NavigatorView } from '../../domain/navigation/types';

interface NavigationContextValue {
  state: NavigationState;
  dispatch: Dispatch<NavigationAction>;
  navigatorView: NavigatorView;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navigationReducer, undefined, createDefaultNavigationState);
  const navigatorStructure = useMemo(() => buildNavigatorStructure(state), [
    state.worksheetsById,
    state.groupsById,
    state.groupOrder,
    state.sheetSectionOrder,
    state.pinnedWorksheetOrder,
  ]);
  const searchResults = useMemo(() => buildSearchResults(state), [
    state.worksheetsById,
    state.groupsById,
    state.query,
  ]);
  const navigatorView = useMemo(() => ({
    ...navigatorStructure,
    searchResults,
  }), [
    navigatorStructure,
    searchResults,
  ]);
  const value = useMemo(() => ({ state, dispatch, navigatorView }), [state, navigatorView]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used inside NavigationProvider.');
  }
  return context;
}
