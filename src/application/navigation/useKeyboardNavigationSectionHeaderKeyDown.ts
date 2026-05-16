import { useCallback, type KeyboardEvent, type MutableRefObject } from 'react';
import type { NavigationSectionId } from '../../domain/navigation/types';

/** Keys handled by worksheet/group/section list navigation. */
const LIST_NAVIGATION_DOM_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

interface UseKeyboardNavigationSectionHeaderKeyDownArgs {
  isSuppressedRef: MutableRefObject<boolean>;
  suppressNextDomFocusRef: MutableRefObject<boolean>;
  handleItemKeyDown: (event: KeyboardEvent<HTMLElement>, itemId: string) => void;
  onExpandSection: (sectionId: NavigationSectionId) => void;
  onCollapseSection: (sectionId: NavigationSectionId) => void;
  markKeyboardActivity: () => void;
  clearFocusAndExitSearchIfNeeded: () => void;
}

export function useKeyboardNavigationSectionHeaderKeyDown({
  isSuppressedRef,
  suppressNextDomFocusRef,
  handleItemKeyDown,
  onExpandSection,
  onCollapseSection,
  markKeyboardActivity,
  clearFocusAndExitSearchIfNeeded,
}: UseKeyboardNavigationSectionHeaderKeyDownArgs) {
  return useCallback(
    (event: KeyboardEvent<HTMLElement>, sectionId: NavigationSectionId, isCollapsed: boolean) => {
      suppressNextDomFocusRef.current = false;

      if (LIST_NAVIGATION_DOM_KEYS.has(event.key)) {
        handleItemKeyDown(event, `section:${sectionId}`);
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
            onExpandSection(sectionId);
            markKeyboardActivity();
          }
          break;
        }

        case 'ArrowLeft': {
          event.preventDefault();
          event.stopPropagation();
          if (!isCollapsed) {
            onCollapseSection(sectionId);
            markKeyboardActivity();
          }
          break;
        }

        case 'Enter':
        case ' ': {
          event.preventDefault();
          event.stopPropagation();
          if (isCollapsed) {
            onExpandSection(sectionId);
          } else {
            onCollapseSection(sectionId);
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
      onCollapseSection,
      onExpandSection,
      suppressNextDomFocusRef,
    ],
  );
}
