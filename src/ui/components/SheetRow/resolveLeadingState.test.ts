import { describe, expect, it } from 'vitest';
import { resolveLeadingState, type ResolveLeadingStateParams } from './resolveLeadingState';

describe('resolveLeadingState', () => {
  const baseParams: ResolveLeadingStateParams = {
    isPinned: false,
    visibility: 'Visible',
    canTogglePin: true,
    isOverlay: false,
    isDragged: false,
    isInteractionSuppressed: false,
    isContextMenuOpen: false,
    isLeadingHovered: false,
    isLeadingFocused: false,
  };

  describe('visible unpinned sheets', () => {
    it('returns indicator when not interacting with leading area', () => {
      const result = resolveLeadingState(baseParams);
      expect(result).toBe('indicator');
    });

    it('returns indicator when hovering row but NOT leading area', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isLeadingHovered: false,
        isLeadingFocused: false,
      });
      expect(result).toBe('indicator');
    });

    it('returns pin-action when hovering leading area', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isLeadingHovered: true,
      });
      expect(result).toBe('pin-action');
    });

    it('returns pin-action when focusing leading area', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isLeadingFocused: true,
      });
      expect(result).toBe('pin-action');
    });

    it('returns pin-action when context menu is open', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isContextMenuOpen: true,
      });
      expect(result).toBe('pin-action');
    });
  });

  describe('pinned sheets', () => {
    const pinnedParams = { ...baseParams, isPinned: true };

    it('returns pinned-indicator when not interacting with leading area', () => {
      const result = resolveLeadingState(pinnedParams);
      expect(result).toBe('pinned-indicator');
    });

    it('returns pinned-indicator when hovering row but NOT leading area', () => {
      const result = resolveLeadingState({
        ...pinnedParams,
        isLeadingHovered: false,
        isLeadingFocused: false,
      });
      expect(result).toBe('pinned-indicator');
    });

    it('returns unpin-action when hovering leading area', () => {
      const result = resolveLeadingState({
        ...pinnedParams,
        isLeadingHovered: true,
      });
      expect(result).toBe('unpin-action');
    });

    it('returns unpin-action when focusing leading area', () => {
      const result = resolveLeadingState({
        ...pinnedParams,
        isLeadingFocused: true,
      });
      expect(result).toBe('unpin-action');
    });

    it('returns unpin-action when context menu is open', () => {
      const result = resolveLeadingState({
        ...pinnedParams,
        isContextMenuOpen: true,
      });
      expect(result).toBe('unpin-action');
    });
  });

  describe('action suppression states', () => {
    it('returns indicator during overlay mode', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isOverlay: true,
        isLeadingHovered: true,
      });
      expect(result).toBe('indicator');
    });

    it('returns indicator during drag', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isDragged: true,
        isLeadingHovered: true,
      });
      expect(result).toBe('indicator');
    });

    it('returns indicator when interaction is suppressed', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isInteractionSuppressed: true,
        isLeadingHovered: true,
      });
      expect(result).toBe('indicator');
    });

    it('returns pinned-indicator for pinned during drag', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isPinned: true,
        isDragged: true,
        isLeadingHovered: true,
      });
      expect(result).toBe('pinned-indicator');
    });
  });

  describe('hidden/very hidden sheets', () => {
    it('still shows indicator when not interacting (no pin for hidden)', () => {
      const result = resolveLeadingState({
        ...baseParams,
        visibility: 'Hidden',
      });
      expect(result).toBe('indicator');
    });

    it('respects icon interaction even for hidden (edge case)', () => {
      const result = resolveLeadingState({
        ...baseParams,
        visibility: 'Hidden',
        isLeadingHovered: true,
      });
      expect(result).toBe('pin-action');
    });
  });

  describe('edge cases', () => {
    it('prioritizes icon interaction over row state', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isLeadingHovered: true,
        isInteractionSuppressed: false,
      });
      expect(result).toBe('pin-action');
    });

    it('context menu overrides suppression check', () => {
      const result = resolveLeadingState({
        ...baseParams,
        isContextMenuOpen: true,
        isLeadingHovered: false,
      });
      expect(result).toBe('pin-action');
    });
  });
});
