import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import {
  getFirstItem,
  getLastItem,
  getNextItem,
  getPrevItem,
  hasItem,
  SEARCH_INPUT_SENTINEL_ID,
} from '../../domain/navigation/navigableItems';

export interface UseKeyboardNavigationArgs {
  /** Current list of navigable items, in visual order */
  items: NavigableItem[];
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
  /** True when context menu is open - suppresses navigation */
  isContextMenuOpen: boolean;
}

interface UseKeyboardNavigationReturn {
  /** Currently focused item ID, or null if no focus */
  focusedItemId: string | null;
  /** Register a DOM element for the given navigable item ID */
  registerElement: (id: string, element: HTMLElement | null) => void;
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
}

/**
 * Hook that manages keyboard arrow navigation across the taskpane.
 *
 * This hook:
 * 1. Tracks the currently focused item ID
 * 2. Maintains a registry of DOM elements for each item
 * 3. Automatically calls .focus() on DOM elements when focusedItemId changes
 * 4. Provides handlers for ArrowDown/ArrowUp/Enter/Home/End on items
 * 5. Provides handlers for ArrowRight/ArrowLeft/Enter on group headers
 * 6. Suppresses all navigation when drag/dialog/rename/menu is active
 *
 * The navigation follows Excel tab-like behavior: linear list, no wrapping,
 * with special handling for group expand/collapse.
 */
export function useKeyboardNavigation(args: UseKeyboardNavigationArgs): UseKeyboardNavigationReturn {
  const {
    items,
    onActivate,
    onExpandGroup,
    onCollapseGroup,
    onFocusSearchInput,
    searchInputRef,
    isSearchActive,
    isDragActive,
    isDialogOpen,
    isRenaming,
    isContextMenuOpen,
  } = args;

  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Registry of DOM elements by navigable item ID
  const elementRegistryRef = useRef<Map<string, HTMLElement>>(new Map());

  // Track previous items to detect when focused item disappears
  const prevItemsRef = useRef<NavigableItem[]>(items);

  // Check if navigation should be suppressed
  const isSuppressed = isDragActive || isDialogOpen || isRenaming || isContextMenuOpen;

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

  /**
   * Set focus to a specific item ID.
   * This updates state and (via useEffect) focuses the DOM element.
   */
  const focusItem = useCallback((itemId: string | null) => {
    if (itemId === null) {
      setFocusedItemId(null);
      return;
    }

    // Validate the ID exists in current items
    if (!hasItem(itemId, items)) {
      return;
    }

    setFocusedItemId(itemId);
  }, [items]);

  /**
   * Clear focus entirely.
   */
  const clearFocus = useCallback(() => {
    setFocusedItemId(null);
  }, []);

  /**
   * Effect: when focusedItemId changes, focus the corresponding DOM element.
   * Also handles the special case of focusing the search input.
   */
  useEffect(() => {
    if (focusedItemId === null) {
      return;
    }

    // Special sentinel: focus the search input
    if (focusedItemId === SEARCH_INPUT_SENTINEL_ID) {
      searchInputRef.current?.focus();
      return;
    }

    const element = elementRegistryRef.current.get(focusedItemId);
    if (element && document.contains(element)) {
      element.focus();
    }
  }, [focusedItemId, searchInputRef]);

  /**
   * Effect: when items change, if the focused item no longer exists,
   * clear focus or move to first available item.
   */
  useEffect(() => {
    if (focusedItemId === null || focusedItemId === SEARCH_INPUT_SENTINEL_ID) {
      prevItemsRef.current = items;
      return;
    }

    // Check if focused item still exists
    if (!hasItem(focusedItemId, items)) {
      // If search was just cleared, focus first item
      const wasSearchCleared = prevItemsRef.current.length > 0 && items.length > 0 &&
        prevItemsRef.current.every(item => item.kind === 'search-result') &&
        !items.every(item => item.kind === 'search-result');

      if (wasSearchCleared) {
        const firstItem = getFirstItem(items);
        if (firstItem) {
          setFocusedItemId(firstItem.id);
        } else {
          setFocusedItemId(null);
        }
      } else {
        setFocusedItemId(null);
      }
    }

    prevItemsRef.current = items;
  }, [items, focusedItemId]);

  /**
   * Handler for keydown events on the search input.
   * ArrowDown: move focus to first result
   * Escape: handled by caller (clears search)
   */
  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (isSuppressed) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        const firstItem = getFirstItem(items);
        if (firstItem) {
          setFocusedItemId(firstItem.id);
        }
      }
    },
    [isSuppressed, items],
  );

  /**
   * Handler for keydown events on individual items (worksheets, search results).
   */
  const handleItemKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, itemId: string) => {
      if (isSuppressed) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          event.stopPropagation();
          const next = getNextItem(itemId, items);
          if (next) {
            setFocusedItemId(next.id);
          }
          break;
        }

        case 'ArrowUp': {
          event.preventDefault();
          event.stopPropagation();
          const prev = getPrevItem(itemId, items, isSearchActive);
          if (prev) {
            if (prev.id === SEARCH_INPUT_SENTINEL_ID) {
              onFocusSearchInput();
            } else {
              setFocusedItemId(prev.id);
            }
          }
          break;
        }

        case 'Enter': {
          event.preventDefault();
          event.stopPropagation();
          onActivate(itemId);
          break;
        }

        case 'Home': {
          event.preventDefault();
          event.stopPropagation();
          const first = getFirstItem(items);
          if (first) {
            setFocusedItemId(first.id);
          }
          break;
        }

        case 'End': {
          event.preventDefault();
          event.stopPropagation();
          const last = getLastItem(items);
          if (last) {
            setFocusedItemId(last.id);
          }
          break;
        }
      }
    },
    [isSuppressed, items, isSearchActive, onActivate, onFocusSearchInput],
  );

  /**
   * Handler for keydown events on group headers.
   * Extends handleItemKeyDown with group-specific actions.
   */
  const handleGroupHeaderKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, groupId: string, isCollapsed: boolean) => {
      // First, handle common navigation keys via item handler
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        // Find the group header item ID to pass to handleItemKeyDown
        const groupItemId = `group-header:${groupId}`;
        handleItemKeyDown(event, groupItemId);
        return;
      }

      if (isSuppressed) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault();
          event.stopPropagation();
          if (isCollapsed) {
            onExpandGroup(groupId);
          }
          break;
        }

        case 'ArrowLeft': {
          event.preventDefault();
          event.stopPropagation();
          if (!isCollapsed) {
            onCollapseGroup(groupId);
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
          break;
        }
      }
    },
    [isSuppressed, onExpandGroup, onCollapseGroup, handleItemKeyDown],
  );

  return {
    focusedItemId,
    registerElement,
    handleSearchKeyDown,
    handleItemKeyDown,
    handleGroupHeaderKeyDown,
    clearFocus,
    focusItem,
  };
}
