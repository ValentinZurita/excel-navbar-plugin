import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import {
  getFirstItem,
  hasItem,
  SEARCH_INPUT_SENTINEL_ID,
} from '../../domain/navigation/navigableItems';

type NavigationInputMode = 'keyboard' | 'pointer' | null;

interface UseKeyboardNavigationItemsReconcileArgs {
  items: NavigableItem[];
  focusedItemId: string | null;
  searchFocusedItemId: string | null;
  isSearchActive: boolean;
  activeWorksheetId: string | null;
  prevItemsRef: MutableRefObject<NavigableItem[]>;
  pendingFocusRestoreAfterSearchClearRef: MutableRefObject<boolean>;
  setKeyboardFocusedItem: (itemId: string) => void;
  setFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setSearchFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setNavigationInputMode: Dispatch<SetStateAction<NavigationInputMode>>;
}

export function useKeyboardNavigationItemsReconcile({
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
}: UseKeyboardNavigationItemsReconcileArgs) {
  useEffect(() => {
    const clearLogicalFocus = () => {
      setFocusedItemId(null);
      setSearchFocusedItemId(null);
      setNavigationInputMode(null);
    };

    const restoreFocusAfterSearchClose = () => {
      pendingFocusRestoreAfterSearchClearRef.current = false;

      const activeItemId = activeWorksheetId ? `worksheet:${activeWorksheetId}` : null;
      if (activeItemId && hasItem(activeItemId, items)) {
        setKeyboardFocusedItem(activeItemId);
        return;
      }

      const firstItem = getFirstItem(items);
      if (firstItem) {
        setKeyboardFocusedItem(firstItem.id);
        return;
      }

      clearLogicalFocus();
    };

    const currentFocusedId = isSearchActive ? searchFocusedItemId : focusedItemId;
    const wasSearchList =
      prevItemsRef.current.length > 0 &&
      prevItemsRef.current.every((item) => item.kind === 'search-result');
    const isSearchList = items.length > 0 && items.every((item) => item.kind === 'search-result');
    const searchJustClosed = wasSearchList && !isSearchList;

    if (searchJustClosed && pendingFocusRestoreAfterSearchClearRef.current) {
      restoreFocusAfterSearchClose();
      prevItemsRef.current = items;
      return;
    }

    if (currentFocusedId === null || currentFocusedId === SEARCH_INPUT_SENTINEL_ID) {
      prevItemsRef.current = items;
      return;
    }

    // Check if focused item still exists in the current linear list.
    if (!hasItem(currentFocusedId, items)) {
      if (!searchJustClosed) {
        clearLogicalFocus();
      } else if (pendingFocusRestoreAfterSearchClearRef.current) {
        restoreFocusAfterSearchClose();
      } else {
        const firstItem = getFirstItem(items);
        if (firstItem) {
          setKeyboardFocusedItem(firstItem.id);
        } else {
          clearLogicalFocus();
        }
      }
    }

    prevItemsRef.current = items;
  }, [
    activeWorksheetId,
    focusedItemId,
    isSearchActive,
    items,
    pendingFocusRestoreAfterSearchClearRef,
    prevItemsRef,
    searchFocusedItemId,
    setFocusedItemId,
    setKeyboardFocusedItem,
    setNavigationInputMode,
    setSearchFocusedItemId,
  ]);
}
