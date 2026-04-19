import { useState, type PointerEvent } from 'react';

export interface LeadingClusterPointerHandlers {
  onPointerEnter: () => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
}

/**
 * Hover/focus-within for a compact leading control cluster (pin slot, unhide slot).
 * Pointer leave ignores moves to descendants so overlay buttons do not flicker.
 */
export function useLeadingClusterInteraction(): {
  isHovered: boolean;
  isFocused: boolean;
  clusterPointerProps: LeadingClusterPointerHandlers;
  actionFocusProps: { onFocus: () => void; onBlur: () => void };
} {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const clusterPointerProps: LeadingClusterPointerHandlers = {
    onPointerEnter: () => setIsHovered(true),
    onPointerLeave: (event) => {
      const { relatedTarget, currentTarget } = event;
      if (!relatedTarget || !(relatedTarget instanceof Node)) {
        setIsHovered(false);
        return;
      }
      if (!currentTarget.contains(relatedTarget)) {
        setIsHovered(false);
      }
    },
  };

  return {
    isHovered,
    isFocused,
    clusterPointerProps,
    actionFocusProps: {
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
    },
  };
}
