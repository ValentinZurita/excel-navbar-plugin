import { useCallback, type KeyboardEvent, type MutableRefObject } from 'react';

/** Keys handled by worksheet/group list navigation (shared by row handlers and capture routing). */
const LIST_NAVIGATION_DOM_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

interface UseKeyboardNavigationGroupHeaderKeyDownArgs {
  isSuppressedRef: MutableRefObject<boolean>;
  suppressNextDomFocusRef: MutableRefObject<boolean>;
  handleItemKeyDown: (event: KeyboardEvent<HTMLElement>, itemId: string) => void;
  onExpandGroup: (groupId: string) => void;
  onCollapseGroup: (groupId: string) => void;
  markKeyboardActivity: () => void;
  clearFocusAndExitSearchIfNeeded: () => void;
}

export function useKeyboardNavigationGroupHeaderKeyDown({
  isSuppressedRef,
  suppressNextDomFocusRef,
  handleItemKeyDown,
  onExpandGroup,
  onCollapseGroup,
  markKeyboardActivity,
  clearFocusAndExitSearchIfNeeded,
}: UseKeyboardNavigationGroupHeaderKeyDownArgs) {
  return useCallback(
    (event: KeyboardEvent<HTMLElement>, groupId: string, isCollapsed: boolean) => {
      suppressNextDomFocusRef.current = false;

      // First, handle common navigation keys via item handler
      if (LIST_NAVIGATION_DOM_KEYS.has(event.key)) {
        // Find the group header item ID to pass to handleItemKeyDown
        const groupItemId = `group-header:${groupId}`;
        handleItemKeyDown(event, groupItemId);
        return;
      }

      if (isSuppressedRef.current) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault();
          event.stopPropagation();
          if (isCollapsed) {
            onExpandGroup(groupId);
            markKeyboardActivity();
          }
          break;
        }

        case 'ArrowLeft': {
          event.preventDefault();
          event.stopPropagation();
          if (!isCollapsed) {
            onCollapseGroup(groupId);
            markKeyboardActivity();
          }
          break;
        }

        case 'Enter': {
          event.preventDefault();
          event.stopPropagation();
          // Toggle collapse state
          if (isCollapsed) {
            onExpandGroup(groupId);
          } else {
            onCollapseGroup(groupId);
          }
          markKeyboardActivity();
          break;
        }

        case 'Escape': {
          event.preventDefault();
          event.stopPropagation();
          clearFocusAndExitSearchIfNeeded();
          break;
        }
      }
    },
    [
      clearFocusAndExitSearchIfNeeded,
      handleItemKeyDown,
      isSuppressedRef,
      markKeyboardActivity,
      onCollapseGroup,
      onExpandGroup,
      suppressNextDomFocusRef,
    ],
  );
}
