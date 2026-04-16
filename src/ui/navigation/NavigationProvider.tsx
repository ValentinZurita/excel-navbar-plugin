import { createContext, useContext, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { createDefaultNavigationState } from '../../domain/navigation/defaultState';
import { buildNavigatorView } from '../../domain/navigation/selectors';
import { navigationReducer } from '../../domain/navigation/reducer';
import type { NavigationAction } from '../../domain/navigation/reducer';
import type { NavigationState } from '../../domain/navigation/types';

interface NavigationContextValue {
  state: NavigationState;
  dispatch: Dispatch<NavigationAction>;
  navigatorView: ReturnType<typeof buildNavigatorView>;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navigationReducer, undefined, createDefaultNavigationState);
  const navigatorView = useMemo(() => buildNavigatorView(state), [
    state.worksheetsById,
    state.groupsById,
    state.groupOrder,
    state.sheetSectionOrder,
    state.pinnedWorksheetOrder,
    state.query,
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
