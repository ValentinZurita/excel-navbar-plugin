import { useMemo } from 'react';
import { computeVisualFocusedItemId } from './useHighlightLifecycle';

interface UseKeyboardNavigationVisualFocusArgs {
  focusedItemId: string | null;
  searchFocusedItemId: string | null;
  activeVisualItemId: string | null;
  isContextMenuOpen: boolean;
  contextMenuTargetItemId: string | null;
  isHighlightSuppressed: boolean;
  isSearchActive: boolean;
}

export function useKeyboardNavigationVisualFocus({
  focusedItemId,
  searchFocusedItemId,
  activeVisualItemId,
  isContextMenuOpen,
  contextMenuTargetItemId,
  isHighlightSuppressed,
  isSearchActive,
}: UseKeyboardNavigationVisualFocusArgs) {
  return useMemo(
    () => computeVisualFocusedItemId({
      logicalFocusedItemId: isSearchActive ? searchFocusedItemId : focusedItemId,
      activeVisualItemId,
      isContextMenuOpen,
      contextMenuTargetItemId,
      isHighlightSuppressed,
      isSearchActive,
    }),
    [
      activeVisualItemId,
      contextMenuTargetItemId,
      focusedItemId,
      isContextMenuOpen,
      isHighlightSuppressed,
      isSearchActive,
      searchFocusedItemId,
    ],
  );
}
