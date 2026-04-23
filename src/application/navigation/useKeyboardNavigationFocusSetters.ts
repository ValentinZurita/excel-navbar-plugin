import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import { hasItem, SEARCH_INPUT_SENTINEL_ID } from '../../domain/navigation/navigableItems';

type NavigationInputMode = 'keyboard' | 'pointer' | null;

interface UseKeyboardNavigationFocusSettersArgs {
  items: NavigableItem[];
  isSearchActiveRef: MutableRefObject<boolean>;
  focusedItemIdRef: MutableRefObject<string | null>;
  searchFocusedItemIdRef: MutableRefObject<string | null>;
  pendingDomFocusRestoreTokenRef: MutableRefObject<number>;
  suppressNextDomFocusRef: MutableRefObject<boolean>;
  setNavigationInputMode: Dispatch<SetStateAction<NavigationInputMode>>;
  setFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setSearchFocusedItemId: Dispatch<SetStateAction<string | null>>;
}

export function useKeyboardNavigationFocusSetters({
  items,
  isSearchActiveRef,
  focusedItemIdRef,
  searchFocusedItemIdRef,
  pendingDomFocusRestoreTokenRef,
  suppressNextDomFocusRef,
  setNavigationInputMode,
  setFocusedItemId,
  setSearchFocusedItemId,
}: UseKeyboardNavigationFocusSettersArgs) {
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
  }, [
    focusedItemIdRef,
    isSearchActiveRef,
    items,
    pendingDomFocusRestoreTokenRef,
    searchFocusedItemIdRef,
    setFocusedItemId,
    setNavigationInputMode,
    setSearchFocusedItemId,
    suppressNextDomFocusRef,
  ]);

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
  }, [
    focusedItemIdRef,
    pendingDomFocusRestoreTokenRef,
    searchFocusedItemIdRef,
    setFocusedItemId,
    setNavigationInputMode,
    setSearchFocusedItemId,
  ]);

  return { setPointerFocusItem, setKeyboardFocusedItem };
}
