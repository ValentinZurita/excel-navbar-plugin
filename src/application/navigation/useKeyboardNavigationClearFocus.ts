import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

type NavigationInputMode = 'keyboard' | 'pointer' | null;

interface UseKeyboardNavigationClearFocusArgs {
  clearIdleTimeout: () => void;
  pendingDomFocusRestoreTokenRef: MutableRefObject<number>;
  focusedItemIdRef: MutableRefObject<string | null>;
  searchFocusedItemIdRef: MutableRefObject<string | null>;
  isSearchActiveRef: MutableRefObject<boolean>;
  pendingFocusRestoreAfterSearchClearRef: MutableRefObject<boolean>;
  onClearSearch: () => void;
  onFocusSearchInput: () => void;
  setFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setSearchFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setNavigationInputMode: Dispatch<SetStateAction<NavigationInputMode>>;
}

export function useKeyboardNavigationClearFocus({
  clearIdleTimeout,
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
}: UseKeyboardNavigationClearFocusArgs) {
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
  }, [
    clearIdleTimeout,
    focusedItemIdRef,
    pendingDomFocusRestoreTokenRef,
    searchFocusedItemIdRef,
    setFocusedItemId,
    setNavigationInputMode,
    setSearchFocusedItemId,
  ]);

  const clearFocusAndExitSearchIfNeeded = useCallback(() => {
    const shouldExitSearchMode = isSearchActiveRef.current;
    clearFocus();

    if (shouldExitSearchMode) {
      pendingFocusRestoreAfterSearchClearRef.current = true;
      onClearSearch();
      onFocusSearchInput();
    }
  }, [
    clearFocus,
    isSearchActiveRef,
    onClearSearch,
    onFocusSearchInput,
    pendingFocusRestoreAfterSearchClearRef,
  ]);

  return { clearFocus, clearFocusAndExitSearchIfNeeded };
}
