import { useEffect, useMemo, useRef, useState } from 'react';

export const HIGHLIGHT_EXIT_MS = 160;

interface UseHighlightLifecycleArgs {
  logicalFocusedItemId: string | null;
  activeVisualItemId: string | null;
  isContextMenuOpen: boolean;
  contextMenuTargetItemId: string | null;
  isSuppressed: boolean;
  isSearchActive: boolean;
}

interface UseHighlightLifecycleReturn {
  visualFocusedItemId: string | null;
  visualExitingItemId: string | null;
}

function isSearchItemId(itemId: string | null) {
  return itemId?.startsWith('search:') ?? false;
}

export function useHighlightLifecycle({
  logicalFocusedItemId,
  activeVisualItemId,
  isContextMenuOpen,
  contextMenuTargetItemId,
  isSuppressed,
  isSearchActive,
}: UseHighlightLifecycleArgs): UseHighlightLifecycleReturn {
  const [visualExitingItemId, setVisualExitingItemId] = useState<string | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const previousVisualFocusRef = useRef<string | null>(null);

  const visualFocusedItemId = useMemo(() => {
    if (isSuppressed || isSearchActive) {
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
  }, [
    activeVisualItemId,
    contextMenuTargetItemId,
    isContextMenuOpen,
    isSearchActive,
    isSuppressed,
    logicalFocusedItemId,
  ]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (isSuppressed || isSearchActive) {
      setVisualExitingItemId(null);
      previousVisualFocusRef.current = null;
      return;
    }

    const previousVisualFocus = previousVisualFocusRef.current;

    if (visualFocusedItemId) {
      if (previousVisualFocus && previousVisualFocus !== visualFocusedItemId) {
        setVisualExitingItemId(previousVisualFocus);
        exitTimerRef.current = window.setTimeout(() => {
          setVisualExitingItemId((currentVisualExitingItemId) => (
            currentVisualExitingItemId === previousVisualFocus ? null : currentVisualExitingItemId
          ));
          exitTimerRef.current = null;
        }, HIGHLIGHT_EXIT_MS);
      } else {
        setVisualExitingItemId((currentVisualExitingItemId) => (
          currentVisualExitingItemId === visualFocusedItemId ? null : currentVisualExitingItemId
        ));
      }

      previousVisualFocusRef.current = visualFocusedItemId;
      return;
    }

    if (previousVisualFocus) {
      setVisualExitingItemId(previousVisualFocus);
      previousVisualFocusRef.current = null;
      exitTimerRef.current = window.setTimeout(() => {
        setVisualExitingItemId((currentVisualExitingItemId) => (
          currentVisualExitingItemId === previousVisualFocus ? null : currentVisualExitingItemId
        ));
        exitTimerRef.current = null;
      }, HIGHLIGHT_EXIT_MS);
      return;
    }

    setVisualExitingItemId(null);
  }, [isSearchActive, isSuppressed, visualFocusedItemId]);

  return {
    visualFocusedItemId,
    visualExitingItemId,
  };
}
