import {
  useEffect,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { NavigableItem } from '../../domain/navigation/types';
import {
  getFirstItem,
  hasItem,
  SEARCH_INPUT_SENTINEL_ID,
} from '../../domain/navigation/navigableItems';
import { isNestedInteractivePointerTarget } from './domFocusUtils';

const LIST_LOGICAL_ROUTED_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'Home',
  'End',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'Escape',
]);

interface UseKeyboardNavigationGlobalListenersArgs {
  items: NavigableItem[];
  activeWorksheetId: string | null;
  focusedItemId: string | null;
  searchFocusedItemId: string | null;
  isSearchActive: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  elementRegistryRef: MutableRefObject<Map<string, HTMLElement>>;
  focusedItemIdRef: MutableRefObject<string | null>;
  searchFocusedItemIdRef: MutableRefObject<string | null>;
  isSearchActiveRef: MutableRefObject<boolean>;
  isSuppressedRef: MutableRefObject<boolean>;
  idleExtendPointerLastAtRef: MutableRefObject<number>;
  contextMenuOwnedFocusRef: MutableRefObject<boolean>;
  clearIdleTimeout: () => void;
  scheduleIdleClear: () => void;
  markKeyboardActivity: () => void;
  clearFocus: () => void;
  navigationInputModeRef: MutableRefObject<'keyboard' | 'pointer' | null>;
  setFocusedItemId: Dispatch<SetStateAction<string | null>>;
  setNavigationInputMode: Dispatch<SetStateAction<'keyboard' | 'pointer' | null>>;
  setKeyboardFocusedItem: (itemId: string) => void;
  handleItemKeyDown: (event: ReactKeyboardEvent<HTMLElement>, itemId: string) => void;
  handleGroupHeaderKeyDown: (
    event: ReactKeyboardEvent<HTMLElement>,
    groupId: string,
    isCollapsed: boolean,
  ) => void;
}

export function useKeyboardNavigationGlobalListeners({
  items,
  activeWorksheetId,
  focusedItemId,
  searchFocusedItemId,
  isSearchActive,
  searchInputRef,
  elementRegistryRef,
  focusedItemIdRef,
  searchFocusedItemIdRef,
  isSearchActiveRef,
  isSuppressedRef,
  idleExtendPointerLastAtRef,
  contextMenuOwnedFocusRef,
  clearIdleTimeout,
  scheduleIdleClear,
  markKeyboardActivity,
  clearFocus,
  navigationInputModeRef,
  setFocusedItemId,
  setNavigationInputMode,
  setKeyboardFocusedItem,
  handleItemKeyDown,
  handleGroupHeaderKeyDown,
}: UseKeyboardNavigationGlobalListenersArgs) {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const navigableElement = target.closest<HTMLElement>('[data-navigable-id]');
      if (!navigableElement) {
        return;
      }

      if (isNestedInteractivePointerTarget(target, navigableElement)) {
        return;
      }

      const navigableId = navigableElement.getAttribute('data-navigable-id');
      if (!navigableId) {
        return;
      }

      if (!isSearchActive) {
        if (hasItem(navigableId, items)) {
          clearIdleTimeout();
          contextMenuOwnedFocusRef.current = false;
          setFocusedItemId(navigableId);
          setNavigationInputMode('pointer');
          scheduleIdleClear();
        } else {
          setFocusedItemId(null);
          setNavigationInputMode(null);
        }
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [
    clearIdleTimeout,
    contextMenuOwnedFocusRef,
    isSearchActive,
    items,
    scheduleIdleClear,
    setFocusedItemId,
    setNavigationInputMode,
  ]);

  useEffect(() => {
    if (isSuppressedRef.current) {
      return undefined;
    }

    const POINTER_IDLE_EXTEND_THROTTLE_MS = 300;

    const handlePointerMove = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (!event.target.closest('.taskpane-shell')) {
        return;
      }

      const logicalFocus = isSearchActiveRef.current
        ? searchFocusedItemIdRef.current
        : focusedItemIdRef.current;
      if (logicalFocus === null) {
        return;
      }

      const now = performance.now();
      if (now - idleExtendPointerLastAtRef.current < POINTER_IDLE_EXTEND_THROTTLE_MS) {
        return;
      }
      idleExtendPointerLastAtRef.current = now;
      if (navigationInputModeRef.current === 'keyboard') {
        clearFocus();
      } else {
        scheduleIdleClear();
      }
    };

    document.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });
    };
  }, [
    focusedItemIdRef,
    idleExtendPointerLastAtRef,
    isSearchActiveRef,
    isSuppressedRef,
    scheduleIdleClear,
    searchFocusedItemIdRef,
    clearFocus,
    navigationInputModeRef,
  ]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const logicalRowFocus = isSearchActive ? searchFocusedItemId : focusedItemId;
      if (isSuppressedRef.current || logicalRowFocus) {
        return;
      }

      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const activeItemId = activeWorksheetId ? `worksheet:${activeWorksheetId}` : null;
        let targetId = activeItemId && hasItem(activeItemId, items) ? activeItemId : null;

        if (!targetId) {
          const firstItem = getFirstItem(items);
          targetId = firstItem?.id ?? null;
        }

        if (targetId) {
          event.preventDefault();
          event.stopPropagation();
          setKeyboardFocusedItem(targetId);
          markKeyboardActivity();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    activeWorksheetId,
    focusedItemId,
    isSearchActive,
    isSuppressedRef,
    items,
    markKeyboardActivity,
    searchFocusedItemId,
    setKeyboardFocusedItem,
  ]);

  useEffect(() => {
    const handleCaptureKeyDown = (event: KeyboardEvent) => {
      if (!LIST_LOGICAL_ROUTED_KEYS.has(event.key)) {
        return;
      }
      if (isSuppressedRef.current) {
        return;
      }

      const active = document.activeElement;
      if (active instanceof HTMLElement && active.isContentEditable) {
        return;
      }
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        if (active === searchInputRef.current) {
          return;
        }
        return;
      }

      const logicalId = isSearchActiveRef.current
        ? searchFocusedItemIdRef.current
        : focusedItemIdRef.current;
      if (!logicalId || logicalId === SEARCH_INPUT_SENTINEL_ID) {
        return;
      }

      const root = elementRegistryRef.current.get(logicalId);
      if (!root || !document.contains(root)) {
        return;
      }

      const logicalItem = items.find((item) => item.id === logicalId);
      if (!logicalItem) {
        return;
      }

      const routeThroughLogicalOwner = () => {
        if (logicalItem.kind === 'group-header') {
          handleGroupHeaderKeyDown(
            event as unknown as ReactKeyboardEvent<HTMLElement>,
            logicalItem.groupId ?? '',
            Boolean(logicalItem.isGroupCollapsed),
          );
          return;
        }

        handleItemKeyDown(event as unknown as ReactKeyboardEvent<HTMLElement>, logicalId);
      };

      if (active instanceof HTMLElement && root.contains(active)) {
        const hostNavigableId = active
          .closest('[data-navigable-id]')
          ?.getAttribute('data-navigable-id');
        if (hostNavigableId !== logicalId) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        routeThroughLogicalOwner();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      routeThroughLogicalOwner();
    };

    document.addEventListener('keydown', handleCaptureKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleCaptureKeyDown, true);
    };
  }, [
    focusedItemIdRef,
    elementRegistryRef,
    handleGroupHeaderKeyDown,
    handleItemKeyDown,
    isSearchActiveRef,
    isSuppressedRef,
    items,
    searchFocusedItemIdRef,
    searchInputRef,
  ]);

  /**
   * Capture-phase safety net: suppress Space when logical focus is on a hidden
   * worksheet row, regardless of where DOM focus actually is. This prevents the
   * global dnd-kit KeyboardSensor from initiating a drag when DOM focus has
   * drifted to a sortable element (a known one-frame lag during cross-section
   * keyboard handoff).
   *
   * Nested interactive children of the hidden row (e.g. the unhide button) are
   * allowed to handle Space normally.
   */
  useEffect(() => {
    const handleSpaceOnHidden = (event: KeyboardEvent) => {
      if (event.key !== ' ') {
        return;
      }

      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }

      const logicalId = isSearchActiveRef.current
        ? searchFocusedItemIdRef.current
        : focusedItemIdRef.current;
      if (!logicalId) {
        return;
      }

      const logicalItem = items.find((item) => item.id === logicalId);
      if (logicalItem?.kind !== 'hidden-worksheet') {
        return;
      }

      const root = elementRegistryRef.current.get(logicalId);
      if (root && active && root.contains(active) && active !== root) {
        const isInteractiveChild = active.closest(
          'button, a, input, textarea, select, [contenteditable="true"]',
        );
        if (isInteractiveChild && root.contains(isInteractiveChild)) {
          return;
        }
      }

      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('keydown', handleSpaceOnHidden, true);
    return () => {
      document.removeEventListener('keydown', handleSpaceOnHidden, true);
    };
  }, [elementRegistryRef, focusedItemIdRef, isSearchActiveRef, items, searchFocusedItemIdRef]);
}
