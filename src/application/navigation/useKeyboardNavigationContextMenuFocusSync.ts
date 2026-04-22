import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import { hasItem } from '../../domain/navigation/navigableItems';

type NavigationInputMode = 'keyboard' | 'pointer' | null;

interface UseKeyboardNavigationContextMenuFocusSyncArgs {
  items: NavigableItem[];
  isSearchActive: boolean;
  isContextMenuOpen: boolean;
  isRenaming: boolean;
  contextMenuTargetItemId: string | null;
  sheetContextMenuOpenedVia: 'pointer' | 'keyboard' | null;
  previousContextMenuOpenRef: MutableRefObject<boolean>;
  contextMenuOwnedFocusRef: MutableRefObject<boolean>;
  lastContextMenuTargetItemIdRef: MutableRefObject<string | null>;
  suppressNextDomFocusRef: MutableRefObject<boolean>;
  clearIdleTimeout: () => void;
  scheduleDomFocusForNavigableId: (itemId: string | null) => void;
  setFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setSearchFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setNavigationInputMode: Dispatch<SetStateAction<NavigationInputMode>>;
  setKeyboardFocusedItem: (itemId: string) => void;
}

export function useKeyboardNavigationContextMenuFocusSync({
  items,
  isSearchActive,
  isContextMenuOpen,
  isRenaming,
  contextMenuTargetItemId,
  sheetContextMenuOpenedVia,
  previousContextMenuOpenRef,
  contextMenuOwnedFocusRef,
  lastContextMenuTargetItemIdRef,
  suppressNextDomFocusRef,
  clearIdleTimeout,
  scheduleDomFocusForNavigableId,
  setFocusedItemId,
  setSearchFocusedItemId,
  setNavigationInputMode,
  setKeyboardFocusedItem,
}: UseKeyboardNavigationContextMenuFocusSyncArgs) {
  useEffect(() => {
    const restoreAnchorFocusAfterMenuClose = () => {
      const anchorId = lastContextMenuTargetItemIdRef.current;
      contextMenuOwnedFocusRef.current = false;
      // Inline rename mounts an input in the row; focusing the row again steals focus
      // and InlineRenameInput's onBlur cancels rename immediately.
      if (anchorId && !isRenaming) {
        suppressNextDomFocusRef.current = true;
        setKeyboardFocusedItem(anchorId);
        scheduleDomFocusForNavigableId(anchorId);
        return;
      }

      setNavigationInputMode(null);
    };

    const openMode: NavigationInputMode = sheetContextMenuOpenedVia === 'keyboard'
      ? 'keyboard'
      : 'pointer';

    if (isSearchActive) {
      if (
        isContextMenuOpen
        && contextMenuTargetItemId?.startsWith('worksheet:')
      ) {
        const worksheetId = contextMenuTargetItemId.slice('worksheet:'.length);
        const searchId = `search:${worksheetId}`;
        if (hasItem(searchId, items)) {
          clearIdleTimeout();
          suppressNextDomFocusRef.current = true;
          setSearchFocusedItemId(searchId);
          setNavigationInputMode(openMode);
          contextMenuOwnedFocusRef.current = true;
          lastContextMenuTargetItemIdRef.current = searchId;
        }
      } else if (
        previousContextMenuOpenRef.current
        && contextMenuOwnedFocusRef.current
        && !isContextMenuOpen
      ) {
        restoreAnchorFocusAfterMenuClose();
      }

      previousContextMenuOpenRef.current = isContextMenuOpen;
      return;
    }

    if (isContextMenuOpen) {
      if (
        contextMenuTargetItemId
        && hasItem(contextMenuTargetItemId, items)
      ) {
        clearIdleTimeout();
        suppressNextDomFocusRef.current = true;
        setFocusedItemId(contextMenuTargetItemId);
        setNavigationInputMode(openMode);
        contextMenuOwnedFocusRef.current = true;
        lastContextMenuTargetItemIdRef.current = contextMenuTargetItemId;
      }

      previousContextMenuOpenRef.current = true;
      return;
    }

    if (previousContextMenuOpenRef.current && contextMenuOwnedFocusRef.current) {
      restoreAnchorFocusAfterMenuClose();
    }

    previousContextMenuOpenRef.current = false;
  }, [
    clearIdleTimeout,
    contextMenuTargetItemId,
    isContextMenuOpen,
    isRenaming,
    isSearchActive,
    items,
    lastContextMenuTargetItemIdRef,
    contextMenuOwnedFocusRef,
    previousContextMenuOpenRef,
    scheduleDomFocusForNavigableId,
    setFocusedItemId,
    setKeyboardFocusedItem,
    setNavigationInputMode,
    setSearchFocusedItemId,
    sheetContextMenuOpenedVia,
    suppressNextDomFocusRef,
  ]);
}
