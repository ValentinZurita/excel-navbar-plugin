import { useCallback, type KeyboardEvent, type MutableRefObject } from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import {
  getFirstItem,
  getLastItem,
  getNextItem,
  getPrevItem,
  SEARCH_INPUT_SENTINEL_ID,
} from '../../domain/navigation/navigableItems';

interface UseKeyboardNavigationItemKeyDownArgs {
  items: NavigableItem[];
  isSearchActive: boolean;
  isSuppressedRef: MutableRefObject<boolean>;
  suppressNextDomFocusRef: MutableRefObject<boolean>;
  elementRegistryRef: MutableRefObject<Map<string, HTMLElement>>;
  getKeyboardAnchorItemId: (fallbackItemId: string) => string | null;
  onActivate: (itemId: string) => void;
  onFocusSearchInput: () => void;
  onCollapseGroup: (groupId: string) => void;
  onRequestSheetContextMenuFromKeyboard?: (payload: {
    worksheetId: string;
    anchorElement: HTMLElement | null;
  }) => void;
  setKeyboardFocusedItem: (itemId: string) => void;
  markKeyboardActivity: () => void;
  clearFocusAndExitSearchIfNeeded: () => void;
}

export function useKeyboardNavigationItemKeyDown({
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
}: UseKeyboardNavigationItemKeyDownArgs) {
  return useCallback((event: KeyboardEvent<HTMLElement>, itemId: string) => {
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
  }, [
    clearFocusAndExitSearchIfNeeded,
    elementRegistryRef,
    getKeyboardAnchorItemId,
    isSearchActive,
    isSuppressedRef,
    items,
    markKeyboardActivity,
    onActivate,
    onCollapseGroup,
    onFocusSearchInput,
    onRequestSheetContextMenuFromKeyboard,
    setKeyboardFocusedItem,
    suppressNextDomFocusRef,
  ]);
}
