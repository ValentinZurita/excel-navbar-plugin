import { useCallback, type MutableRefObject } from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import { getFirstItem, hasItem } from '../../domain/navigation/navigableItems';

interface UseKeyboardNavigationAnchorArgs {
  items: NavigableItem[];
  activeWorksheetId: string | null;
  isSearchActive: boolean;
  focusedItemIdRef: MutableRefObject<string | null>;
  searchFocusedItemIdRef: MutableRefObject<string | null>;
}

export function useKeyboardNavigationAnchor({
  items,
  activeWorksheetId,
  isSearchActive,
  focusedItemIdRef,
  searchFocusedItemIdRef,
}: UseKeyboardNavigationAnchorArgs) {
  return useCallback(
    (fallbackItemId: string): string | null => {
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
    },
    [activeWorksheetId, focusedItemIdRef, isSearchActive, items, searchFocusedItemIdRef],
  );
}
