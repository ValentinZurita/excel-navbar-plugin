/**
 * Visual anchor for worksheet navigation (which row/header "owns" the strong highlight).
 * Exit timer must be >= `--excel-nav-highlight-fade-ms` in styles.css so `data-visual-exiting` clears after the CSS animation.
 */
export const HIGHLIGHT_EXIT_MS = 280;

export function isSearchItemId(itemId: string | null) {
  return itemId?.startsWith('search:') ?? false;
}

export function isMainListNavigableId(itemId: string | null) {
  return Boolean(itemId && (itemId.startsWith('worksheet:') || itemId.startsWith('group-header:')));
}

export interface ComputeVisualFocusedItemIdArgs {
  logicalFocusedItemId: string | null;
  activeVisualItemId: string | null;
  isContextMenuOpen: boolean;
  contextMenuTargetItemId: string | null;
  isHighlightSuppressed: boolean;
  isSearchActive: boolean;
}

export function computeVisualFocusedItemId({
  logicalFocusedItemId,
  activeVisualItemId,
  isContextMenuOpen,
  contextMenuTargetItemId,
  isHighlightSuppressed,
  isSearchActive,
}: ComputeVisualFocusedItemIdArgs): string | null {
  if (isHighlightSuppressed) {
    return null;
  }

  // Search mode: map sheet context-menu target to the search row id so highlight stays aligned.
  if (isSearchActive) {
    if (isContextMenuOpen && contextMenuTargetItemId?.startsWith('worksheet:')) {
      const worksheetId = contextMenuTargetItemId.slice('worksheet:'.length);
      return `search:${worksheetId}`;
    }
    return null;
  }

  if (isContextMenuOpen) {
    return contextMenuTargetItemId && !isSearchItemId(contextMenuTargetItemId)
      ? contextMenuTargetItemId
      : null;
  }

  return logicalFocusedItemId && !isSearchItemId(logicalFocusedItemId)
    ? logicalFocusedItemId
    : activeVisualItemId;
}
