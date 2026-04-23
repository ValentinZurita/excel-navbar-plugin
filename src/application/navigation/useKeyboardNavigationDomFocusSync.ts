import { useLayoutEffect, type MutableRefObject, type RefObject } from 'react';
import { SEARCH_INPUT_SENTINEL_ID } from '../../domain/navigation/navigableItems';

interface UseKeyboardNavigationDomFocusSyncArgs {
  focusedItemId: string | null;
  searchFocusedItemId: string | null;
  isSearchActive: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  suppressNextDomFocusRef: MutableRefObject<boolean>;
  elementRegistryRef: MutableRefObject<Map<string, HTMLElement>>;
}

export function useKeyboardNavigationDomFocusSync({
  focusedItemId,
  searchFocusedItemId,
  isSearchActive,
  searchInputRef,
  suppressNextDomFocusRef,
  elementRegistryRef,
}: UseKeyboardNavigationDomFocusSyncArgs) {
  useLayoutEffect(() => {
    const targetFocusedItemId = isSearchActive ? searchFocusedItemId : focusedItemId;

    if (targetFocusedItemId === null) {
      return;
    }

    if (suppressNextDomFocusRef.current) {
      suppressNextDomFocusRef.current = false;
      return;
    }

    // Special sentinel: focus search input
    if (targetFocusedItemId === SEARCH_INPUT_SENTINEL_ID) {
      searchInputRef.current?.focus();
      return;
    }

    const element = elementRegistryRef.current.get(targetFocusedItemId);
    if (element && document.contains(element)) {
      element.focus({ preventScroll: true });
      if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }, [
    elementRegistryRef,
    focusedItemId,
    isSearchActive,
    searchFocusedItemId,
    searchInputRef,
    suppressNextDomFocusRef,
  ]);
}
