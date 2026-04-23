import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  HIGHLIGHT_EXIT_MS,
  computeVisualFocusedItemId,
  isMainListNavigableId,
} from './useHighlightLifecycle';
import {
  focusElementWithManagedRingSuppression,
} from './domFocusUtils';
import { useKeyboardNavigationAnchor } from './useKeyboardNavigationAnchor';
import { useKeyboardNavigationClearFocus } from './useKeyboardNavigationClearFocus';
import { useKeyboardNavigationContextMenuFocusSync } from './useKeyboardNavigationContextMenuFocusSync';
import { useKeyboardNavigationDomFocusRestore } from './useKeyboardNavigationDomFocusRestore';
import { useKeyboardNavigationFocusItem } from './useKeyboardNavigationFocusItem';
import { useKeyboardNavigationFocusSetters } from './useKeyboardNavigationFocusSetters';
import { useKeyboardNavigationGroupHeaderKeyDown } from './useKeyboardNavigationGroupHeaderKeyDown';
import { useKeyboardNavigationGlobalListeners } from './useKeyboardNavigationGlobalListeners';
import { useKeyboardNavigationIdleLifecycle } from './useKeyboardNavigationIdleLifecycle';
import { useKeyboardNavigationItemKeyDown } from './useKeyboardNavigationItemKeyDown';
import { useKeyboardNavigationItemsReconcile } from './useKeyboardNavigationItemsReconcile';
import { useKeyboardNavigationSearchKeyDown } from './useKeyboardNavigationSearchKeyDown';
import type { NavigableItem } from '../../domain/navigation/types';
import {
  SEARCH_INPUT_SENTINEL_ID,
} from '../../domain/navigation/navigableItems';

/** After this much time without keyboard navigation activity, transient row focus clears and the wash returns to the active worksheet. */
export const TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS = 10_000;

type NavigationInputMode = 'keyboard' | 'pointer' | null;

export interface UseKeyboardNavigationArgs {
  /** Current list of navigable items, in visual order */
  items: NavigableItem[];
  /** Current active worksheet in workbook (used as keyboard restart anchor) */
  activeWorksheetId: string | null;
  /** Clears the active search query when leaving search mode (Escape). */
  onClearSearch: () => void;
  /** Called when user presses Enter on a navigable item */
  onActivate: (itemId: string) => void;
  /** Called when ArrowRight is pressed on a collapsed group header */
  onExpandGroup: (groupId: string) => void;
  /** Called when ArrowLeft is pressed on an expanded group header */
  onCollapseGroup: (groupId: string) => void;
  /** Called to return focus to the search input (e.g., ArrowUp from first result) */
  onFocusSearchInput: () => void;
  /** Ref to the search input element */
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  /** True when a search query is active */
  isSearchActive: boolean;
  /** True when drag-and-drop is active - suppresses all keyboard navigation */
  isDragActive: boolean;
  /** True when any modal dialog is open - suppresses navigation */
  isDialogOpen: boolean;
  /** True when inline rename is active - suppresses navigation */
  isRenaming: boolean;
  /** Fallback visual anchor when no logical row focus (e.g. idle pointer clear). */
  activeVisualItemId: string | null;
  /** True when context menu is open - suppresses navigation */
  isContextMenuOpen: boolean;
  /**
   * ArrowRight on a worksheet or search-result row: open the sheet context menu
   * anchored to the row element (when provided).
   */
  onRequestSheetContextMenuFromKeyboard?: (payload: {
    worksheetId: string;
    anchorElement: HTMLElement | null;
  }) => void;
  /**
   * Context-menu target id (`worksheet:…`, `group-header:…`, etc.).
   * Worksheet targets may reference Hidden rows, which share same linear item IDs.
   */
  contextMenuTargetItemId: string | null;
  /** Sheet context menu: how it was opened (affects navigationInputMode while menu is open). */
  sheetContextMenuOpenedVia?: 'pointer' | 'keyboard' | null;
}

interface UseKeyboardNavigationReturn {
  /** Currently focused item ID, or null if no focus */
  focusedItemId: string | null;
  /** Strong highlight owner (logical focus, context menu target, or active anchor). */
  visualFocusedItemId: string | null;
  /** Row/header id whose highlight layer is fading out after losing ownership. */
  visualExitingItemId: string | null;
  /** Source of the current navigation focus state (keyboard/pointer). */
  navigationInputMode: NavigationInputMode;
  /** Register a DOM element for the given navigable item ID */
  registerElement: (id: string, element: HTMLElement | null) => void;
  /** Update focused item from pointer interaction without stealing DOM focus */
  setPointerFocusItem: (itemId: string) => void;
  /** Handler for keydown events on the search input */
  handleSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Handler for keydown events on individual items (worksheets, search results) */
  handleItemKeyDown: (event: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  /** Handler for keydown events on group headers */
  handleGroupHeaderKeyDown: (
    event: React.KeyboardEvent<HTMLElement>,
    groupId: string,
    isCollapsed: boolean,
  ) => void;
  /** Clear focus (e.g., when search is cleared) */
  clearFocus: () => void;
  /** Set focus to a specific item ID */
  focusItem: (itemId: string) => void;
  /** Prime keyboard focus refs/DOM immediately when a keyboard-opened menu is dismissed. */
  restoreFocusAfterMenuDismiss: (itemId: string) => void;
}

/**
 * Hook that manages keyboard arrow navigation across the taskpane.
 *
 * This hook:
 * 1. Tracks the currently focused item ID
 * 2. Maintains a registry of DOM elements for each item
 * 3. Automatically calls .focus() on DOM elements when focusedItemId changes
 * 4. Provides handlers for ArrowDown/ArrowUp/Enter/Home/End on items
 * 5. Provides handlers for ArrowRight/ArrowLeft/Enter on group headers; ArrowRight on
 *    worksheet/search-result rows opens the sheet context menu when a callback is wired
 * 6. Suppresses all navigation when drag/dialog/rename/menu is active
 *
 * The navigation follows Excel tab-like behavior: linear list, no wrapping,
 * with special handling for group expand/collapse.
 */
export function useKeyboardNavigation(args: UseKeyboardNavigationArgs): UseKeyboardNavigationReturn {
  const {
    items,
    activeWorksheetId,
    onClearSearch,
    onActivate,
    onExpandGroup,
    onCollapseGroup,
    onFocusSearchInput,
    searchInputRef,
    isSearchActive,
    isDragActive,
    isDialogOpen,
    isRenaming,
    activeVisualItemId,
    isContextMenuOpen,
    contextMenuTargetItemId,
    onRequestSheetContextMenuFromKeyboard,
    sheetContextMenuOpenedVia = null,
  } = args;

  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [navigationInputMode, setNavigationInputMode] = useState<NavigationInputMode>(null);
  const [searchFocusedItemId, setSearchFocusedItemId] = useState<string | null>(null);
  const [visualExitingItemId, setVisualExitingItemId] = useState<string | null>(null);

  // Registry of DOM elements by navigable item ID
  const elementRegistryRef = useRef<Map<string, HTMLElement>>(new Map());

  // Track previous items to detect when focused item disappears
  const prevItemsRef = useRef<NavigableItem[]>(items);
  const idleClearTimeoutRef = useRef<number | null>(null);
  const suppressNextDomFocusRef = useRef(false);
  const pendingFocusRestoreAfterSearchClearRef = useRef(false);
  const previousContextMenuOpenRef = useRef(isContextMenuOpen);
  const contextMenuOwnedFocusRef = useRef(false);
  const lastContextMenuTargetItemIdRef = useRef<string | null>(contextMenuTargetItemId);
  const exitTimerRef = useRef<number | null>(null);
  /** Last committed visual highlight owner; updated synchronously each render (after computing outgoing). */
  const prevVisualOwnerRef = useRef<string | null>(null);
  const focusedItemIdRef = useRef<string | null>(null);
  const searchFocusedItemIdRef = useRef<string | null>(null);
  const isSearchActiveRef = useRef(isSearchActive);
  const idleExtendPointerLastAtRef = useRef(0);
  const pendingDomFocusRestoreTokenRef = useRef(0);

  // Check if navigation should be suppressed
  const isSuppressed = isDragActive || isDialogOpen || isRenaming || isContextMenuOpen;
  const isHighlightSuppressed = isDragActive || isDialogOpen || isRenaming;
  const isSuppressedRef = useRef(isSuppressed);

  const visualFocusedItemId = useMemo(
    () => computeVisualFocusedItemId({
      logicalFocusedItemId: isSearchActive ? searchFocusedItemId : focusedItemId,
      activeVisualItemId,
      isContextMenuOpen,
      contextMenuTargetItemId,
      isHighlightSuppressed,
      isSearchActive,
    }),
    [
      activeVisualItemId,
      contextMenuTargetItemId,
      focusedItemId,
      isContextMenuOpen,
      isDialogOpen,
      isDragActive,
      isRenaming,
      isSearchActive,
      searchFocusedItemId,
    ],
  );

  const prevOwner = prevVisualOwnerRef.current;
  const syncVisualExitTargetId =
    prevOwner !== null
    && prevOwner !== visualFocusedItemId
    && isMainListNavigableId(prevOwner)
      ? prevOwner
      : null;
  prevVisualOwnerRef.current = visualFocusedItemId;

  const visualExitingItemIdResolved = syncVisualExitTargetId ?? visualExitingItemId;

  focusedItemIdRef.current = focusedItemId;
  searchFocusedItemIdRef.current = searchFocusedItemId;
  isSearchActiveRef.current = isSearchActive;
  isSuppressedRef.current = isSuppressed;

  const armHighlightExit = useCallback((outgoingMainListId: string) => {
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setVisualExitingItemId(outgoingMainListId);
    exitTimerRef.current = window.setTimeout(() => {
      setVisualExitingItemId((current) => (
        current === outgoingMainListId ? null : current
      ));
      exitTimerRef.current = null;
    }, HIGHLIGHT_EXIT_MS);
  }, []);

  /**
   * Register or unregister a DOM element for a navigable item.
   * Called via useEffect in components that render navigable items.
   */
  const registerElement = useCallback((id: string, element: HTMLElement | null) => {
    if (element === null) {
      elementRegistryRef.current.delete(id);
    } else {
      elementRegistryRef.current.set(id, element);
    }
  }, []);

  const { setPointerFocusItem, setKeyboardFocusedItem } = useKeyboardNavigationFocusSetters({
    items,
    isSearchActiveRef,
    focusedItemIdRef,
    searchFocusedItemIdRef,
    pendingDomFocusRestoreTokenRef,
    suppressNextDomFocusRef,
    setNavigationInputMode,
    setFocusedItemId,
    setSearchFocusedItemId,
  });

  const focusItem = useKeyboardNavigationFocusItem({
    items,
    pendingDomFocusRestoreTokenRef,
    focusedItemIdRef,
    searchFocusedItemIdRef,
    setFocusedItemId,
    setSearchFocusedItemId,
    setNavigationInputMode,
    setKeyboardFocusedItem,
  });

  const getKeyboardAnchorItemId = useKeyboardNavigationAnchor({
    items,
    activeWorksheetId,
    isSearchActive,
    focusedItemIdRef,
    searchFocusedItemIdRef,
  });

  const { clearFocus, clearFocusAndExitSearchIfNeeded } = useKeyboardNavigationClearFocus({
    idleClearTimeoutRef,
    pendingDomFocusRestoreTokenRef,
    focusedItemIdRef,
    searchFocusedItemIdRef,
    isSearchActiveRef,
    pendingFocusRestoreAfterSearchClearRef,
    onClearSearch,
    onFocusSearchInput,
    setFocusedItemId,
    setSearchFocusedItemId,
    setNavigationInputMode,
  });

  const { clearIdleTimeout, scheduleIdleClear, markKeyboardActivity } = useKeyboardNavigationIdleLifecycle({
    idleClearTimeoutRef,
    clearFocus,
    idleTimeoutMs: TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS,
  });

  const { scheduleDomFocusForNavigableId, restoreFocusAfterMenuDismiss } = useKeyboardNavigationDomFocusRestore({
    items,
    searchInputRef,
    elementRegistryRef,
    pendingDomFocusRestoreTokenRef,
    contextMenuOwnedFocusRef,
    lastContextMenuTargetItemIdRef,
    suppressNextDomFocusRef,
    isSuppressedRef,
    focusedItemIdRef,
    searchFocusedItemIdRef,
    clearIdleTimeout,
    setNavigationInputMode,
    setFocusedItemId,
    setSearchFocusedItemId,
  });

  /**
   * Arm the fade-out timer when the visual owner changes. `syncVisualExitTargetId` already exposes
   * the outgoing id on the first render of the new owner so CSS can animate before this runs.
   */
  useLayoutEffect(() => {
    if (isHighlightSuppressed || isSearchActive) {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setVisualExitingItemId(null);
      return;
    }

    if (syncVisualExitTargetId) {
      armHighlightExit(syncVisualExitTargetId);
    }
  }, [armHighlightExit, isHighlightSuppressed, isSearchActive, syncVisualExitTargetId]);

  useLayoutEffect(() => {
    return () => {
      clearIdleTimeout();
      pendingFocusRestoreAfterSearchClearRef.current = false;
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [clearIdleTimeout]);

  useKeyboardNavigationContextMenuFocusSync({
    items,
    isSearchActive,
    isContextMenuOpen,
    isRenaming,
    contextMenuTargetItemId,
    sheetContextMenuOpenedVia,
    previousContextMenuOpenRef,
    contextMenuOwnedFocusRef,
    lastContextMenuTargetItemIdRef,
    suppressNextDomFocusRef,
    clearIdleTimeout,
    scheduleDomFocusForNavigableId,
    setFocusedItemId,
    setSearchFocusedItemId,
    setNavigationInputMode,
    setKeyboardFocusedItem,
  });

  /**
   * Effect: when focusedItemId changes, focus the corresponding DOM element.
   * Also handles the special case of focusing the search input.
   */
  useLayoutEffect(() => {
    const targetFocusedItemId = isSearchActive ? searchFocusedItemId : focusedItemId;

    if (targetFocusedItemId === null) {
      return;
    }

    if (suppressNextDomFocusRef.current) {
      suppressNextDomFocusRef.current = false;
      return;
    }

    // Special sentinel: focus the search input
    if (targetFocusedItemId === SEARCH_INPUT_SENTINEL_ID) {
      searchInputRef.current?.focus();
      return;
    }

    const element = elementRegistryRef.current.get(targetFocusedItemId);
    if (element && document.contains(element)) {
      element.focus({ preventScroll: true });
    }
  }, [focusedItemId, searchFocusedItemId, isSearchActive, searchInputRef]);

  useKeyboardNavigationItemsReconcile({
    items,
    focusedItemId,
    searchFocusedItemId,
    isSearchActive,
    activeWorksheetId,
    prevItemsRef,
    pendingFocusRestoreAfterSearchClearRef,
    setKeyboardFocusedItem,
    setFocusedItemId,
    setSearchFocusedItemId,
    setNavigationInputMode,
  });

  const handleSearchKeyDown = useKeyboardNavigationSearchKeyDown({
    items,
    focusedItemId,
    searchFocusedItemId,
    isSuppressedRef,
    setKeyboardFocusedItem,
    markKeyboardActivity,
    clearFocus,
    clearFocusAndExitSearchIfNeeded,
    onActivate,
  });

  const handleItemKeyDown = useKeyboardNavigationItemKeyDown({
    items,
    isSearchActive,
    isSuppressedRef,
    suppressNextDomFocusRef,
    elementRegistryRef,
    getKeyboardAnchorItemId,
    onActivate,
    onFocusSearchInput,
    onCollapseGroup,
    onRequestSheetContextMenuFromKeyboard,
    setKeyboardFocusedItem,
    markKeyboardActivity,
    clearFocusAndExitSearchIfNeeded,
  });

  const handleGroupHeaderKeyDown = useKeyboardNavigationGroupHeaderKeyDown({
    isSuppressedRef,
    suppressNextDomFocusRef,
    handleItemKeyDown,
    onExpandGroup,
    onCollapseGroup,
    markKeyboardActivity,
    clearFocusAndExitSearchIfNeeded,
  });

  useKeyboardNavigationGlobalListeners({
    items,
    activeWorksheetId,
    focusedItemId,
    searchFocusedItemId,
    isSearchActive,
    searchInputRef,
    elementRegistryRef,
    focusedItemIdRef,
    searchFocusedItemIdRef,
    isSearchActiveRef,
    isSuppressedRef,
    idleExtendPointerLastAtRef,
    contextMenuOwnedFocusRef,
    clearIdleTimeout,
    scheduleIdleClear,
    markKeyboardActivity,
    setFocusedItemId,
    setNavigationInputMode,
    setKeyboardFocusedItem,
    handleItemKeyDown,
    handleGroupHeaderKeyDown,
  });

  return {
    focusedItemId: isSearchActive ? searchFocusedItemId : focusedItemId,
    visualFocusedItemId,
    visualExitingItemId: visualExitingItemIdResolved,
    navigationInputMode,
    registerElement,
    setPointerFocusItem,
    handleSearchKeyDown,
    handleItemKeyDown,
    handleGroupHeaderKeyDown,
    clearFocus,
    focusItem,
    restoreFocusAfterMenuDismiss,
  };
}
