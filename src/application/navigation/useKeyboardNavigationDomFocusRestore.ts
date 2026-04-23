import { useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import { focusElementWithManagedRingSuppression } from './domFocusUtils';
import { hasItem, SEARCH_INPUT_SENTINEL_ID } from '../../domain/navigation/navigableItems';
import type { NavigableItem } from '../../domain/navigation/types';

type NavigationInputMode = 'keyboard' | 'pointer' | null;

interface UseKeyboardNavigationDomFocusRestoreArgs {
  items: NavigableItem[];
  searchInputRef: RefObject<HTMLInputElement | null>;
  elementRegistryRef: MutableRefObject<Map<string, HTMLElement>>;
  pendingDomFocusRestoreTokenRef: MutableRefObject<number>;
  contextMenuOwnedFocusRef: MutableRefObject<boolean>;
  lastContextMenuTargetItemIdRef: MutableRefObject<string | null>;
  suppressNextDomFocusRef: MutableRefObject<boolean>;
  isSuppressedRef: MutableRefObject<boolean>;
  focusedItemIdRef: MutableRefObject<string | null>;
  searchFocusedItemIdRef: MutableRefObject<string | null>;
  clearIdleTimeout: () => void;
  setNavigationInputMode: Dispatch<SetStateAction<NavigationInputMode>>;
  setFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setSearchFocusedItemId: Dispatch<SetStateAction<string | null>>;
}

export function useKeyboardNavigationDomFocusRestore({
  items,
  searchInputRef,
  elementRegistryRef,
  pendingDomFocusRestoreTokenRef,
  contextMenuOwnedFocusRef,
  lastContextMenuTargetItemIdRef,
  suppressNextDomFocusRef,
  isSuppressedRef,
  focusedItemIdRef,
  searchFocusedItemIdRef,
  clearIdleTimeout,
  setNavigationInputMode,
  setFocusedItemId,
  setSearchFocusedItemId,
}: UseKeyboardNavigationDomFocusRestoreArgs) {
  const scheduleDomFocusForNavigableId = useCallback((itemId: string | null) => {
    if (!itemId || itemId === SEARCH_INPUT_SENTINEL_ID) {
      return;
    }
    const id = itemId;
    const token = ++pendingDomFocusRestoreTokenRef.current;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (pendingDomFocusRestoreTokenRef.current !== token) {
          return;
        }
        const el = elementRegistryRef.current.get(id);
        if (el && document.contains(el)) {
          focusElementWithManagedRingSuppression(el);
          // Clearing on timer let :focus-visible return while focus still sat on row
          // (green ring flash). Blur cleanup enough; keyboard rows hide host outline via CSS.
        }
      });
    });
  }, [elementRegistryRef, pendingDomFocusRestoreTokenRef]);

  const restoreFocusAfterMenuDismiss = useCallback((itemId: string) => {
    if (!hasItem(itemId, items)) {
      return;
    }

    pendingDomFocusRestoreTokenRef.current += 1;
    clearIdleTimeout();
    contextMenuOwnedFocusRef.current = false;
    lastContextMenuTargetItemIdRef.current = itemId;
    suppressNextDomFocusRef.current = false;
    isSuppressedRef.current = false;

    if (itemId.startsWith('search:') || itemId === SEARCH_INPUT_SENTINEL_ID) {
      searchFocusedItemIdRef.current = itemId;
      setSearchFocusedItemId(itemId);
    } else {
      focusedItemIdRef.current = itemId;
      setFocusedItemId(itemId);
    }
    setNavigationInputMode('keyboard');

    const el = itemId === SEARCH_INPUT_SENTINEL_ID
      ? searchInputRef.current
      : elementRegistryRef.current.get(itemId) ?? null;
    if (el && document.contains(el)) {
      focusElementWithManagedRingSuppression(el, {
        suppressFocusRingAttribute: itemId !== SEARCH_INPUT_SENTINEL_ID,
      });
      return;
    }

    if (itemId === SEARCH_INPUT_SENTINEL_ID) {
      searchInputRef.current?.focus();
      return;
    }

    scheduleDomFocusForNavigableId(itemId);
  }, [
    clearIdleTimeout,
    contextMenuOwnedFocusRef,
    elementRegistryRef,
    focusedItemIdRef,
    isSuppressedRef,
    items,
    lastContextMenuTargetItemIdRef,
    pendingDomFocusRestoreTokenRef,
    scheduleDomFocusForNavigableId,
    searchFocusedItemIdRef,
    searchInputRef,
    setFocusedItemId,
    setNavigationInputMode,
    setSearchFocusedItemId,
    suppressNextDomFocusRef,
  ]);

  return { scheduleDomFocusForNavigableId, restoreFocusAfterMenuDismiss };
}
