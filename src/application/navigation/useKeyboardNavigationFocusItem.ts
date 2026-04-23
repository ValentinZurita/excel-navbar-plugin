import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import { hasItem } from '../../domain/navigation/navigableItems';

type NavigationInputMode = 'keyboard' | 'pointer' | null;

interface UseKeyboardNavigationFocusItemArgs {
  items: NavigableItem[];
  pendingDomFocusRestoreTokenRef: MutableRefObject<number>;
  focusedItemIdRef: MutableRefObject<string | null>;
  searchFocusedItemIdRef: MutableRefObject<string | null>;
  setFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setSearchFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setNavigationInputMode: Dispatch<SetStateAction<NavigationInputMode>>;
  setKeyboardFocusedItem: (itemId: string) => void;
}

export function useKeyboardNavigationFocusItem({
  items,
  pendingDomFocusRestoreTokenRef,
  focusedItemIdRef,
  searchFocusedItemIdRef,
  setFocusedItemId,
  setSearchFocusedItemId,
  setNavigationInputMode,
  setKeyboardFocusedItem,
}: UseKeyboardNavigationFocusItemArgs) {
  return useCallback(
    (itemId: string | null) => {
      pendingDomFocusRestoreTokenRef.current += 1;
      if (itemId === null) {
        focusedItemIdRef.current = null;
        searchFocusedItemIdRef.current = null;
        setFocusedItemId(null);
        setSearchFocusedItemId(null);
        setNavigationInputMode(null);
        return;
      }

      // Validate ID exists in current items
      if (!hasItem(itemId, items)) {
        return;
      }

      setKeyboardFocusedItem(itemId);
    },
    [
      focusedItemIdRef,
      items,
      pendingDomFocusRestoreTokenRef,
      searchFocusedItemIdRef,
      setFocusedItemId,
      setKeyboardFocusedItem,
      setNavigationInputMode,
      setSearchFocusedItemId,
    ],
  );
}
