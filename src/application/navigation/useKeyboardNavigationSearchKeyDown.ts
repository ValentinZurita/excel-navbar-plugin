import { useCallback, type KeyboardEvent, type MutableRefObject } from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import {
  getFirstItem,
  getLastItem,
  getNextItem,
  getPrevItem,
  hasItem,
  SEARCH_INPUT_SENTINEL_ID,
} from '../../domain/navigation/navigableItems';

interface UseKeyboardNavigationSearchKeyDownArgs {
  items: NavigableItem[];
  focusedItemId: string | null;
  searchFocusedItemId: string | null;
  isSuppressedRef: MutableRefObject<boolean>;
  setKeyboardFocusedItem: (itemId: string) => void;
  markKeyboardActivity: () => void;
  clearFocus: () => void;
  clearFocusAndExitSearchIfNeeded: () => void;
  onActivate: (itemId: string) => void;
}

export function useKeyboardNavigationSearchKeyDown({
  items,
  focusedItemId,
  searchFocusedItemId,
  isSuppressedRef,
  setKeyboardFocusedItem,
  markKeyboardActivity,
  clearFocus,
  clearFocusAndExitSearchIfNeeded,
  onActivate,
}: UseKeyboardNavigationSearchKeyDownArgs) {
  return useCallback((event: KeyboardEvent<HTMLInputElement>) => {
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
  }, [
    clearFocus,
    clearFocusAndExitSearchIfNeeded,
    focusedItemId,
    isSuppressedRef,
    items,
    markKeyboardActivity,
    onActivate,
    searchFocusedItemId,
    setKeyboardFocusedItem,
  ]);
}
