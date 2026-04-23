export type LeadingState = 'indicator' | 'pin-action' | 'unpin-action' | 'pinned-indicator';

export interface ResolveLeadingStateParams {
  isPinned: boolean;
  visibility: 'Visible' | 'Hidden' | 'VeryHidden';
  canTogglePin: boolean;
  isOverlay: boolean;
  isDragged: boolean;
  isInteractionSuppressed: boolean;
  isContextMenuOpen: boolean;
  isLeadingHovered: boolean;
  isLeadingFocused: boolean;
}

/**
 * Pure function to resolve the visual state of a sheet row's leading area.
 *
 * Design contract:
 * - Hover on row does NOT show pin action
 * - Hover/focus on leading icon area DOES show pin/unpin action
 * - Pinned sheets show static pin indicator when not interacting with icon
 * - Actions suppressed during drag or when row is in overlay mode
 */
export function resolveLeadingState({
  isPinned,
  canTogglePin,
  isOverlay,
  isDragged,
  isInteractionSuppressed,
  isContextMenuOpen,
  isLeadingHovered,
  isLeadingFocused,
}: ResolveLeadingStateParams): LeadingState {
  // Cannot interact with pin when dragging, in overlay, or suppressed
  const canShowAction = canTogglePin && !isOverlay && !isDragged && !isInteractionSuppressed;

  // Icon interaction (hover or focus) triggers action visibility
  const isIconInteracting = isLeadingHovered || isLeadingFocused;

  // Context menu also shows action for discoverability
  const shouldShowAction = canShowAction && (isIconInteracting || isContextMenuOpen);

  if (isPinned) {
    return shouldShowAction ? 'unpin-action' : 'pinned-indicator';
  }

  return shouldShowAction ? 'pin-action' : 'indicator';
}
