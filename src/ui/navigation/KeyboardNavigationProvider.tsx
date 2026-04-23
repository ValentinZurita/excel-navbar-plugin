import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import {
  useKeyboardNavigation,
  type UseKeyboardNavigationArgs,
} from '../../application/navigation/useKeyboardNavigation';

interface KeyboardNavContextValue {
  /** Currently focused item ID, or null if no focus */
  focusedItemId: string | null;
  /** Taskpane item with strong visual highlight */
  visualFocusedItemId: string | null;
  /** Taskpane item fading out after highlight release */
  visualExitingItemId: string | null;
  /** Source of current focused row (keyboard or pointer) */
  navigationInputMode: 'keyboard' | 'pointer' | null;
  /** Register a DOM element for the given navigable item ID */
  registerElement: (id: string, element: HTMLElement | null) => void;
  /** Update focused item from pointer interaction without stealing DOM focus */
  setPointerFocusItem: (itemId: string) => void;
  /** Handler for keydown events on the search input */
  handleSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Handler for keydown events on individual items */
  handleItemKeyDown: (event: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  /** Handler for keydown events on group headers */
  handleGroupHeaderKeyDown: (
    event: React.KeyboardEvent<HTMLElement>,
    groupId: string,
    isCollapsed: boolean,
  ) => void;
  /** Clear focus */
  clearFocus: () => void;
  /** Set focus to a specific item */
  focusItem: (itemId: string) => void;
  /** Restore anchor focus immediately when a keyboard-opened menu is dismissed. */
  restoreFocusAfterMenuDismiss: (itemId: string) => void;
  /** Ref to the search input for programmatic focus */
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const KeyboardNavContext = createContext<KeyboardNavContextValue | null>(null);

interface KeyboardNavigationProviderProps extends UseKeyboardNavigationArgs {
  children: ReactNode;
}

/**
 * Provides keyboard navigation context to all descendant components.
 *
 * This provider wraps useKeyboardNavigation and exposes its state and handlers
 * via React context, avoiding prop drilling through the component tree.
 *
 * Components that need to participate in keyboard navigation should:
 * 1. Call useKeyboardNavContext() to get navigation utilities
 * 2. Register their DOM element via registerElement(id, element)
 * 3. Handle keydown events via the provided handlers
 * 4. Apply data-focused attribute based on focusedItemId
 */
export function KeyboardNavigationProvider(
  props: KeyboardNavigationProviderProps,
): React.ReactElement {
  const { children, ...hookArgs } = props;

  const { activeVisualItemId, ...navigationArgs } = hookArgs;
  const navigation = useKeyboardNavigation({ ...navigationArgs, activeVisualItemId });

  const contextValue: KeyboardNavContextValue = {
    focusedItemId: navigation.focusedItemId,
    visualFocusedItemId: navigation.visualFocusedItemId,
    visualExitingItemId: navigation.visualExitingItemId,
    navigationInputMode: navigation.navigationInputMode,
    registerElement: navigation.registerElement,
    setPointerFocusItem: navigation.setPointerFocusItem,
    handleSearchKeyDown: navigation.handleSearchKeyDown,
    handleItemKeyDown: navigation.handleItemKeyDown,
    handleGroupHeaderKeyDown: navigation.handleGroupHeaderKeyDown,
    clearFocus: navigation.clearFocus,
    focusItem: navigation.focusItem,
    restoreFocusAfterMenuDismiss: navigation.restoreFocusAfterMenuDismiss,
    searchInputRef: hookArgs.searchInputRef,
  };

  return <KeyboardNavContext.Provider value={contextValue}>{children}</KeyboardNavContext.Provider>;
}

/**
 * Hook to access keyboard navigation context.
 * Must be used within a KeyboardNavigationProvider.
 */
export function useKeyboardNavContext(): KeyboardNavContextValue {
  const context = useContext(KeyboardNavContext);

  if (context === null) {
    throw new Error('useKeyboardNavContext must be used within a KeyboardNavigationProvider');
  }

  return context;
}
