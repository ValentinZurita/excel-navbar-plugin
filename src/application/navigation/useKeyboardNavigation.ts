import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  HIGHLIGHT_EXIT_MS,
  computeVisualFocusedItemId,
  isMainListNavigableId,
} from './useHighlightLifecycle';
import type { NavigableItem } from '../../domain/navigation/types';
import {
  getFirstItem,
  getLastItem,
  getNextItem,
  getPrevItem,
  hasItem,
  SEARCH_INPUT_SENTINEL_ID,
} from '../../domain/navigation/navigableItems';

/** After this much time without keyboard navigation activity, transient row focus clears and the wash returns to the active worksheet. */
export const TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS = 10_000;

/** Keys handled by worksheet/group list navigation (shared by row handlers and capture routing). */
const LIST_NAVIGATION_DOM_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);
/** Row keys that must still follow logical focus even if DOM focus lags behind one frame. */
const LIST_LOGICAL_ROUTED_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'Home',
  'End',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'Escape',
]);

type NavigationInputMode = 'keyboard' | 'pointer' | null;
const SUPPRESS_NAV_FOCUS_ATTR = 'data-suppress-nav-focus-ring';

function isNestedInteractivePointerTarget(target: EventTarget | null, currentTarget: HTMLElement) {
  if (!(target instanceof HTMLElement) || target === currentTarget) {
    return false;
  }

  const navigableId = currentTarget.getAttribute('data-navigable-id');
  if (
    navigableId?.startsWith('group-header:')
    && target.closest('.group-toggle')
  ) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const interactiveTarget = target.closest(
    'input, textarea, select, button, a, [contenteditable="true"], [role="textbox"]',
  );

  return Boolean(interactiveTarget && currentTarget.contains(interactiveTarget));
}

function focusElementWithManagedRingSuppression(
  element: HTMLElement,
  options?: { suppressFocusRingAttribute?: boolean },
) {
  const suppressFocusRingAttribute = options?.suppressFocusRingAttribute ?? true;
  let cleared = false;
  const clearSuppress = () => {
    if (cleared) {
      return;
    }
    cleared = true;
    element.removeEventListener('blur', onBlur);
    element.removeAttribute(SUPPRESS_NAV_FOCUS_ATTR);
  };
  const onBlur = () => {
    clearSuppress();
  };

  element.addEventListener('blur', onBlur, { once: true });
  if (suppressFocusRingAttribute) {
    element.setAttribute(SUPPRESS_NAV_FOCUS_ATTR, 'true');
  }
  element.focus({ preventScroll: true });
}

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

  const setPointerFocusItem = useCallback((itemId: string) => {
    if (!hasItem(itemId, items)) {
      return;
    }
    pendingDomFocusRestoreTokenRef.current += 1;

    // Pointer interaction always switches mode to pointer, even when hovering
    // the same item that keyboard focused. This ensures CSS hover styles are
    // restored after keyboard navigation.
    setNavigationInputMode('pointer');

    const currentFocused = isSearchActiveRef.current
      ? searchFocusedItemIdRef.current
      : focusedItemIdRef.current;
    if (currentFocused === itemId) {
      return;
    }

    // Pointer hover should update keyboard anchor/visual row without stealing
    // text-input focus from the search field.
    suppressNextDomFocusRef.current = true;

    if (itemId.startsWith('search:') || itemId === SEARCH_INPUT_SENTINEL_ID) {
      searchFocusedItemIdRef.current = itemId;
      setSearchFocusedItemId(itemId);
    } else {
      focusedItemIdRef.current = itemId;
      setFocusedItemId(itemId);
    }
  }, [items]);

  const setKeyboardFocusedItem = useCallback((itemId: string) => {
    pendingDomFocusRestoreTokenRef.current += 1;
    if (itemId.startsWith('search:') || itemId === SEARCH_INPUT_SENTINEL_ID) {
      searchFocusedItemIdRef.current = itemId;
      setSearchFocusedItemId(itemId);
    } else {
      focusedItemIdRef.current = itemId;
      setFocusedItemId(itemId);
    }
    setNavigationInputMode('keyboard');
  }, []);

  /**
   * After closing a context menu, the activeElement often lands on a scrollable shell
   * (arrow keys then scroll). Re-attach DOM focus to the navigable node on the next frames.
   */
  function scheduleDomFocusForNavigableId(itemId: string | null) {
    if (!itemId || itemId === SEARCH_INPUT_SENTINEL_ID) {
      return;
    }
    const id = itemId;
    const token = ++pendingDomFocusRestoreTokenRef.current;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (pendingDomFocusRestoreTokenRef.current !== token) {
          return;
        }
        const el = elementRegistryRef.current.get(id);
        if (el && document.contains(el)) {
          focusElementWithManagedRingSuppression(el);
          // Clearing on a timer let :focus-visible return while focus still sat on the row
          // (green ring flash). Blur cleanup is enough; keyboard rows hide host outline via CSS.
        }
      });
    });
  }

  /**
   * Set focus to a specific item ID.
   * This updates state and (via useEffect) focuses the DOM element.
   */
  const focusItem = useCallback((itemId: string | null) => {
    pendingDomFocusRestoreTokenRef.current += 1;
    if (itemId === null) {
      focusedItemIdRef.current = null;
      searchFocusedItemIdRef.current = null;
      setFocusedItemId(null);
      setSearchFocusedItemId(null);
      setNavigationInputMode(null);
      return;
    }

    // Validate the ID exists in current items
    if (!hasItem(itemId, items)) {
      return;
    }

    setKeyboardFocusedItem(itemId);
  }, [items, setKeyboardFocusedItem]);

  const clearIdleTimeout = useCallback(() => {
    if (idleClearTimeoutRef.current !== null) {
      window.clearTimeout(idleClearTimeoutRef.current);
      idleClearTimeoutRef.current = null;
    }
  }, []);

  const restoreFocusAfterMenuDismiss = useCallback((itemId: string) => {
    if (!hasItem(itemId, items)) {
      return;
    }

    pendingDomFocusRestoreTokenRef.current += 1;
    clearIdleTimeout();
    contextMenuOwnedFocusRef.current = false;
    lastContextMenuTargetItemIdRef.current = itemId;
    suppressNextDomFocusRef.current = false;
    isSuppressedRef.current = false;

    if (itemId.startsWith('search:') || itemId === SEARCH_INPUT_SENTINEL_ID) {
      searchFocusedItemIdRef.current = itemId;
      setSearchFocusedItemId(itemId);
    } else {
      focusedItemIdRef.current = itemId;
      setFocusedItemId(itemId);
    }
    setNavigationInputMode('keyboard');

    const el = itemId === SEARCH_INPUT_SENTINEL_ID
      ? searchInputRef.current
      : elementRegistryRef.current.get(itemId) ?? null;
    if (el && document.contains(el)) {
      focusElementWithManagedRingSuppression(el, {
        suppressFocusRingAttribute: itemId !== SEARCH_INPUT_SENTINEL_ID,
      });
      return;
    }

    if (itemId === SEARCH_INPUT_SENTINEL_ID) {
      searchInputRef.current?.focus();
      return;
    }

    scheduleDomFocusForNavigableId(itemId);
  }, [clearIdleTimeout, items, searchInputRef]);

  const getKeyboardAnchorItemId = useCallback((fallbackItemId: string): string | null => {
    // In search mode there is no active worksheet concept for navigation anchoring.
    // Prefer latest search-focused item (pointer/keyboard), then focusedItemId,
    // then fallback/list bounds.
    if (isSearchActive) {
      if (searchFocusedItemIdRef.current && hasItem(searchFocusedItemIdRef.current, items)) {
        return searchFocusedItemIdRef.current;
      }

      if (focusedItemIdRef.current && hasItem(focusedItemIdRef.current, items)) {
        return focusedItemIdRef.current;
      }

      if (hasItem(fallbackItemId, items)) {
        return fallbackItemId;
      }

      const firstSearchItem = getFirstItem(items);
      return firstSearchItem?.id ?? null;
    }

    if (focusedItemIdRef.current && hasItem(focusedItemIdRef.current, items)) {
      return focusedItemIdRef.current;
    }

    if (activeWorksheetId) {
      const activeWorksheetItemId = `worksheet:${activeWorksheetId}`;
      if (hasItem(activeWorksheetItemId, items)) {
        return activeWorksheetItemId;
      }
    }

    if (hasItem(fallbackItemId, items)) {
      return fallbackItemId;
    }

    const firstItem = getFirstItem(items);
    return firstItem?.id ?? null;
  }, [activeWorksheetId, items, isSearchActive]);

  /**
   * Clear focus entirely.
   */
  const clearFocus = useCallback(() => {
    clearIdleTimeout();
    pendingDomFocusRestoreTokenRef.current += 1;
    focusedItemIdRef.current = null;
    searchFocusedItemIdRef.current = null;
    setFocusedItemId(null);
    setSearchFocusedItemId(null);
    setNavigationInputMode(null);
    // Remove native focus ring from previously focused element to avoid
    // residual browser/host focus outline after keyboard highlight clears.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [clearIdleTimeout]);

  const clearFocusAndExitSearchIfNeeded = useCallback(() => {
    const shouldExitSearchMode = isSearchActiveRef.current;
    clearFocus();

    if (shouldExitSearchMode) {
      pendingFocusRestoreAfterSearchClearRef.current = true;
      onClearSearch();
      onFocusSearchInput();
    }
  }, [clearFocus, onClearSearch, onFocusSearchInput]);

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

  const scheduleIdleClear = useCallback(() => {
    clearIdleTimeout();
    idleClearTimeoutRef.current = window.setTimeout(() => {
      clearFocus();
      idleClearTimeoutRef.current = null;
    }, TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS);
  }, [clearIdleTimeout, clearFocus]);

  const markKeyboardActivity = useCallback(() => {
    scheduleIdleClear();
  }, [scheduleIdleClear]);

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

  useEffect(() => {
    if (isSearchActive) {
      if (
        isContextMenuOpen
        && contextMenuTargetItemId?.startsWith('worksheet:')
      ) {
        const wid = contextMenuTargetItemId.slice('worksheet:'.length);
        const searchId = `search:${wid}`;
        if (hasItem(searchId, items)) {
          clearIdleTimeout();
          suppressNextDomFocusRef.current = true;
          setSearchFocusedItemId(searchId);
          setNavigationInputMode(sheetContextMenuOpenedVia === 'keyboard' ? 'keyboard' : 'pointer');
          contextMenuOwnedFocusRef.current = true;
          lastContextMenuTargetItemIdRef.current = searchId;
        }
      } else if (
        previousContextMenuOpenRef.current
        && contextMenuOwnedFocusRef.current
        && !isContextMenuOpen
      ) {
        const anchorId = lastContextMenuTargetItemIdRef.current;
        contextMenuOwnedFocusRef.current = false;
        // Inline rename mounts an input in the row; focusing the row again steals focus
        // and InlineRenameInput's onBlur cancels rename immediately.
        if (anchorId && !isRenaming) {
          suppressNextDomFocusRef.current = true;
          setKeyboardFocusedItem(anchorId);
          scheduleDomFocusForNavigableId(anchorId);
        } else {
          setNavigationInputMode(null);
        }
      }

      previousContextMenuOpenRef.current = isContextMenuOpen;
      return;
    }

    if (isContextMenuOpen) {
      if (
        contextMenuTargetItemId
        && hasItem(contextMenuTargetItemId, items)
      ) {
        clearIdleTimeout();
        suppressNextDomFocusRef.current = true;
        setFocusedItemId(contextMenuTargetItemId);
        setNavigationInputMode(sheetContextMenuOpenedVia === 'keyboard' ? 'keyboard' : 'pointer');
        contextMenuOwnedFocusRef.current = true;
        lastContextMenuTargetItemIdRef.current = contextMenuTargetItemId;
      }

      previousContextMenuOpenRef.current = true;
      return;
    }

    if (previousContextMenuOpenRef.current && contextMenuOwnedFocusRef.current) {
      const anchorId = lastContextMenuTargetItemIdRef.current;
      contextMenuOwnedFocusRef.current = false;
      if (anchorId && !isRenaming) {
        suppressNextDomFocusRef.current = true;
        setKeyboardFocusedItem(anchorId);
        scheduleDomFocusForNavigableId(anchorId);
      } else {
        setNavigationInputMode(null);
      }
    }

    previousContextMenuOpenRef.current = false;
  }, [
    clearIdleTimeout,
    contextMenuTargetItemId,
    isContextMenuOpen,
    isRenaming,
    isSearchActive,
    items,
    sheetContextMenuOpenedVia,
    setKeyboardFocusedItem,
  ]);

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

  /**
   * Effect: when items change, if the focused item no longer exists,
   * clear focus or move to first available item.
   */
  useEffect(() => {
    const currentFocusedId = isSearchActive ? searchFocusedItemId : focusedItemId;
    const wasSearchList = prevItemsRef.current.length > 0
      && prevItemsRef.current.every((item) => item.kind === 'search-result');
    const isSearchList = items.length > 0 && items.every((item) => item.kind === 'search-result');
    const searchJustClosed = wasSearchList && !isSearchList;

    if (searchJustClosed && pendingFocusRestoreAfterSearchClearRef.current) {
      pendingFocusRestoreAfterSearchClearRef.current = false;

      const activeItemId = activeWorksheetId ? `worksheet:${activeWorksheetId}` : null;
      if (activeItemId && hasItem(activeItemId, items)) {
        setKeyboardFocusedItem(activeItemId);
      } else {
        const firstItem = getFirstItem(items);
        if (firstItem) {
          setKeyboardFocusedItem(firstItem.id);
        } else {
          setFocusedItemId(null);
          setSearchFocusedItemId(null);
          setNavigationInputMode(null);
        }
      }

      prevItemsRef.current = items;
      return;
    }

    if (currentFocusedId === null || currentFocusedId === SEARCH_INPUT_SENTINEL_ID) {
      prevItemsRef.current = items;
      return;
    }

    // Check if focused item still exists in the current linear list.
    if (!hasItem(currentFocusedId, items)) {
      // If search was just cleared without explicit pending restore, focus first item.
      const wasSearchCleared = searchJustClosed;

      if (wasSearchCleared) {
        if (pendingFocusRestoreAfterSearchClearRef.current) {
          pendingFocusRestoreAfterSearchClearRef.current = false;

          const activeItemId = activeWorksheetId ? `worksheet:${activeWorksheetId}` : null;
          if (activeItemId && hasItem(activeItemId, items)) {
            setKeyboardFocusedItem(activeItemId);
          } else {
            const firstItem = getFirstItem(items);
            if (firstItem) {
              setKeyboardFocusedItem(firstItem.id);
            } else {
              setFocusedItemId(null);
              setSearchFocusedItemId(null);
              setNavigationInputMode(null);
            }
          }
        } else {
          const firstItem = getFirstItem(items);
          if (firstItem) {
            setKeyboardFocusedItem(firstItem.id);
          } else {
            setFocusedItemId(null);
            setSearchFocusedItemId(null);
            setNavigationInputMode(null);
          }
        }
      } else {
        setFocusedItemId(null);
        setSearchFocusedItemId(null);
        setNavigationInputMode(null);
      }
    }

    prevItemsRef.current = items;
  }, [
    items,
    focusedItemId,
    searchFocusedItemId,
    isSearchActive,
    activeWorksheetId,
    setKeyboardFocusedItem,
  ]);

  /**
   * Keep keyboard focus state in sync with pointer interactions.
   *
   * If user clicks a different navigable item with mouse/touch, move focusedItemId
   * to that item so the previous keyboard-highlighted item loses focus state.
   */
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const navigableElement = target.closest<HTMLElement>('[data-navigable-id]');
      if (!navigableElement) {
        return;
      }

      if (isNestedInteractivePointerTarget(target, navigableElement)) {
        return;
      }

      const navigableId = navigableElement.getAttribute('data-navigable-id');
      if (!navigableId) {
        return;
      }

      // Pointer down global synchronization should only affect taskpane mode.
      // Search mode uses dedicated pointer focus handling at row level.
      if (!isSearchActive) {
        if (hasItem(navigableId, items)) {
          clearIdleTimeout();
          contextMenuOwnedFocusRef.current = false;
          setFocusedItemId(navigableId);
          setNavigationInputMode('pointer');
          scheduleIdleClear();
        } else {
          setFocusedItemId(null);
          setNavigationInputMode(null);
        }
      }
    };

    // Capture phase helps us synchronize focus state before bubbling handlers.
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [clearIdleTimeout, items, isSearchActive, scheduleIdleClear]);

  /**
   * Moving the pointer inside the task pane shell postpones the idle clear that returns the
   * strong wash to the active worksheet (throttled so we do not reset timers every frame).
   */
  useEffect(() => {
    if (isSuppressedRef.current) {
      return undefined;
    }

    const POINTER_IDLE_EXTEND_THROTTLE_MS = 300;

    const handlePointerMove = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (!event.target.closest('.taskpane-shell')) {
        return;
      }

      const logicalFocus = isSearchActiveRef.current
        ? searchFocusedItemIdRef.current
        : focusedItemIdRef.current;
      if (logicalFocus === null) {
        return;
      }

      const now = performance.now();
      if (now - idleExtendPointerLastAtRef.current < POINTER_IDLE_EXTEND_THROTTLE_MS) {
        return;
      }
      idleExtendPointerLastAtRef.current = now;
      scheduleIdleClear();
    };

    document.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });
    };
  }, [scheduleIdleClear]);

  /**
   * Catch global ArrowDown / ArrowUp when no navigable item has focus.
   * This allows the user to immediately start navigating with arrows right after
   * opening the taskpane via a keyboard shortcut, without needing to click anything first.
   */
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const logicalRowFocus = isSearchActive ? searchFocusedItemId : focusedItemId;
      if (isSuppressedRef.current || logicalRowFocus) {
        return;
      }

      // Do not intercept if user is typing in a native input/textarea
      if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      )) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // Find the best item to start navigation from (active worksheet or first item)
        const activeItemId = activeWorksheetId ? `worksheet:${activeWorksheetId}` : null;
        let targetId = activeItemId && hasItem(activeItemId, items) ? activeItemId : null;
        
        if (!targetId) {
           const firstItem = getFirstItem(items);
           targetId = firstItem?.id ?? null;
        }

        if (targetId) {
          event.preventDefault();
          event.stopPropagation();
          setKeyboardFocusedItem(targetId);
          markKeyboardActivity();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    focusedItemId,
    searchFocusedItemId,
    isSearchActive,
    activeWorksheetId,
    items,
    setKeyboardFocusedItem,
    markKeyboardActivity,
  ]);

  /**
   * Handler for keydown events on the search input.
   * ArrowDown: move focus to first result
   * Escape: handled by caller (clears search)
   */
  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (isSuppressedRef.current) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        const searchAnchorItemId = searchFocusedItemId && hasItem(searchFocusedItemId, items)
          ? searchFocusedItemId
          : null;
        const anchorItemId = searchAnchorItemId ?? (focusedItemId && hasItem(focusedItemId, items) ? focusedItemId : null);
        const nextItem = anchorItemId ? getNextItem(anchorItemId, items) : getFirstItem(items);
        if (nextItem) {
          setKeyboardFocusedItem(nextItem.id);
          markKeyboardActivity();
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        
        const anchorItemId = searchFocusedItemId ?? (focusedItemId && hasItem(focusedItemId, items) ? focusedItemId : null) ?? getFirstItem(items)?.id;
        if (anchorItemId) {
          onActivate(anchorItemId);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();

        const searchAnchorItemId = searchFocusedItemId && hasItem(searchFocusedItemId, items)
          ? searchFocusedItemId
          : null;
        const anchorItemId = searchAnchorItemId ?? (focusedItemId && hasItem(focusedItemId, items) ? focusedItemId : null);
        if (!anchorItemId) {
          const lastItem = getLastItem(items);
          if (lastItem) {
            setKeyboardFocusedItem(lastItem.id);
            markKeyboardActivity();
          }
          return;
        }

        const prevItem = getPrevItem(anchorItemId, items, true);
        if (prevItem && prevItem.id !== SEARCH_INPUT_SENTINEL_ID) {
          setKeyboardFocusedItem(prevItem.id);
          markKeyboardActivity();
          return;
        }

        clearFocus();
        return;
      }

      if (event.key === 'Escape') {
        clearFocusAndExitSearchIfNeeded();
      }
    },
    [
      items,
      focusedItemId,
      searchFocusedItemId,
      markKeyboardActivity,
      clearFocusAndExitSearchIfNeeded,
      setKeyboardFocusedItem,
    ],
  );

  /**
   * Handler for keydown events on individual items (worksheets, search results).
   */
  const handleItemKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, itemId: string) => {
      if (isSuppressedRef.current) {
        return;
      }

      // Once the user starts navigating again, any stale "don't focus DOM yet"
      // flag from menu-close restoration must be cleared so the newly selected row
      // can reclaim real DOM focus instead of leaving focus stuck on the old row.
      suppressNextDomFocusRef.current = false;

      const anchorItemId = getKeyboardAnchorItemId(itemId);
      const currentItem = anchorItemId
        ? items.find((item) => item.id === anchorItemId)
        : undefined;

      switch (event.key) {
        case 'ArrowDown': {
          if (!anchorItemId) {
            break;
          }

          event.preventDefault();
          event.stopPropagation();
          const next = getNextItem(anchorItemId, items);
          if (next) {
            setKeyboardFocusedItem(next.id);
            markKeyboardActivity();
          }
          break;
        }

        case 'ArrowUp': {
          if (!anchorItemId) {
            break;
          }

          event.preventDefault();
          event.stopPropagation();
          const prev = getPrevItem(anchorItemId, items, isSearchActive);
          if (prev) {
            if (prev.id === SEARCH_INPUT_SENTINEL_ID) {
              onFocusSearchInput();
            } else {
              setKeyboardFocusedItem(prev.id);
            }
            markKeyboardActivity();
          }
          break;
        }

        case 'Enter': {
          event.preventDefault();
          event.stopPropagation();
          if (currentItem?.kind === 'hidden-worksheet') {
            const worksheetId = currentItem.worksheetId;
            if (!worksheetId || !onRequestSheetContextMenuFromKeyboard) {
              break;
            }

            const anchorElement = anchorItemId
              ? elementRegistryRef.current.get(anchorItemId) ?? null
              : null;
            onRequestSheetContextMenuFromKeyboard({ worksheetId, anchorElement });
            markKeyboardActivity();
            break;
          }

          onActivate(anchorItemId ?? itemId);
          break;
        }

        case 'Home': {
          event.preventDefault();
          event.stopPropagation();
          const first = getFirstItem(items);
          if (first) {
            setKeyboardFocusedItem(first.id);
            markKeyboardActivity();
          }
          break;
        }

        case 'End': {
          event.preventDefault();
          event.stopPropagation();
          const last = getLastItem(items);
          if (last) {
            setKeyboardFocusedItem(last.id);
            markKeyboardActivity();
          }
          break;
        }

        case 'ArrowRight': {
          const worksheetId =
            currentItem?.kind === 'worksheet'
            || currentItem?.kind === 'hidden-worksheet'
            || currentItem?.kind === 'search-result'
              ? currentItem.worksheetId
              : undefined;
          if (!worksheetId || !onRequestSheetContextMenuFromKeyboard) {
            break;
          }

          event.preventDefault();
          event.stopPropagation();
          const anchorElement = anchorItemId
            ? elementRegistryRef.current.get(anchorItemId) ?? null
            : null;
          onRequestSheetContextMenuFromKeyboard({ worksheetId, anchorElement });
          markKeyboardActivity();
          break;
        }

        case 'ArrowLeft': {
          if (currentItem?.kind === 'worksheet' && currentItem.groupId) {
            event.preventDefault();
            event.stopPropagation();
            // Move focus to the group header before collapsing so focus remains stable
            // after the worksheet row disappears from the expanded list.
            setKeyboardFocusedItem(`group-header:${currentItem.groupId}`);
            onCollapseGroup(currentItem.groupId);
            markKeyboardActivity();
          }
          break;
        }

        case 'Escape': {
          event.preventDefault();
          event.stopPropagation();
          clearFocusAndExitSearchIfNeeded();
          break;
        }
      }
    },
    [
      items,
      getKeyboardAnchorItemId,
      isSearchActive,
      onActivate,
      onFocusSearchInput,
      onCollapseGroup,
      setKeyboardFocusedItem,
      markKeyboardActivity,
      clearFocusAndExitSearchIfNeeded,
      onRequestSheetContextMenuFromKeyboard,
    ],
  );

  /**
   * Handler for keydown events on group headers.
   * Extends handleItemKeyDown with group-specific actions.
   */
  const handleGroupHeaderKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, groupId: string, isCollapsed: boolean) => {
      suppressNextDomFocusRef.current = false;

      // First, handle common navigation keys via item handler
      if (LIST_NAVIGATION_DOM_KEYS.has(event.key)) {
        // Find the group header item ID to pass to handleItemKeyDown
        const groupItemId = `group-header:${groupId}`;
        handleItemKeyDown(event, groupItemId);
        return;
      }

      if (isSuppressedRef.current) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault();
          event.stopPropagation();
          if (isCollapsed) {
            onExpandGroup(groupId);
            markKeyboardActivity();
          }
          break;
        }

        case 'ArrowLeft': {
          event.preventDefault();
          event.stopPropagation();
          if (!isCollapsed) {
            onCollapseGroup(groupId);
            markKeyboardActivity();
          }
          break;
        }

        case 'Enter': {
          event.preventDefault();
          event.stopPropagation();
          // Toggle collapse state
          if (isCollapsed) {
            onExpandGroup(groupId);
          } else {
            onCollapseGroup(groupId);
          }
          markKeyboardActivity();
          break;
        }

        case 'Escape': {
          event.preventDefault();
          event.stopPropagation();
          clearFocusAndExitSearchIfNeeded();
          break;
        }
      }
    },
    [
      onExpandGroup,
      onCollapseGroup,
      handleItemKeyDown,
      markKeyboardActivity,
      clearFocusAndExitSearchIfNeeded,
    ],
  );

  /**
   * When logical list focus points at a navigable row/header but DOM focus sits on a scrollable
   * ancestor (common after menus close in Office webviews) or on a nested control (pin button),
   * route managed keys through the current logical owner instead of letting the shell scroll or
   * a stale DOM node handle them.
   */
  useEffect(() => {
    const handleCaptureKeyDown = (event: KeyboardEvent) => {
      if (!LIST_LOGICAL_ROUTED_KEYS.has(event.key)) {
        return;
      }
      if (isSuppressedRef.current) {
        return;
      }

      const active = document.activeElement;
      if (active instanceof HTMLElement && active.isContentEditable) {
        return;
      }
      if (
        active instanceof HTMLInputElement
        || active instanceof HTMLTextAreaElement
        || active instanceof HTMLSelectElement
      ) {
        if (active === searchInputRef.current) {
          return;
        }
        return;
      }

      const logicalId = isSearchActiveRef.current
        ? searchFocusedItemIdRef.current
        : focusedItemIdRef.current;
      if (!logicalId || logicalId === SEARCH_INPUT_SENTINEL_ID) {
        return;
      }

      const root = elementRegistryRef.current.get(logicalId);
      if (!root || !document.contains(root)) {
        return;
      }

      const logicalItem = items.find((item) => item.id === logicalId);
      if (!logicalItem) {
        return;
      }

      const routeThroughLogicalOwner = () => {
        if (logicalItem.kind === 'group-header') {
          handleGroupHeaderKeyDown(
            event as unknown as ReactKeyboardEvent<HTMLElement>,
            logicalItem.groupId ?? '',
            Boolean(logicalItem.isGroupCollapsed),
          );
          return;
        }

        handleItemKeyDown(event as unknown as ReactKeyboardEvent<HTMLElement>, logicalId);
      };

      if (active instanceof HTMLElement && root.contains(active)) {
        const hostNavigableId = active.closest('[data-navigable-id]')?.getAttribute('data-navigable-id');
        if (hostNavigableId !== logicalId) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        routeThroughLogicalOwner();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      routeThroughLogicalOwner();
    };

    document.addEventListener('keydown', handleCaptureKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleCaptureKeyDown, true);
    };
  }, [handleGroupHeaderKeyDown, handleItemKeyDown, items, searchInputRef]);

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
