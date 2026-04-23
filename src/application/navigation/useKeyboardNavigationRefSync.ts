import type { MutableRefObject } from 'react';

interface UseKeyboardNavigationRefSyncArgs {
  focusedItemId: string | null;
  searchFocusedItemId: string | null;
  isSearchActive: boolean;
  isSuppressed: boolean;
  focusedItemIdRef: MutableRefObject<string | null>;
  searchFocusedItemIdRef: MutableRefObject<string | null>;
  isSearchActiveRef: MutableRefObject<boolean>;
  isSuppressedRef: MutableRefObject<boolean>;
}

export function useKeyboardNavigationRefSync({
  focusedItemId,
  searchFocusedItemId,
  isSearchActive,
  isSuppressed,
  focusedItemIdRef,
  searchFocusedItemIdRef,
  isSearchActiveRef,
  isSuppressedRef,
}: UseKeyboardNavigationRefSyncArgs) {
  focusedItemIdRef.current = focusedItemId;
  searchFocusedItemIdRef.current = searchFocusedItemId;
  isSearchActiveRef.current = isSearchActive;
  isSuppressedRef.current = isSuppressed;
}
