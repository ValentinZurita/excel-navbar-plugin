import { useLayoutEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { HIGHLIGHT_EXIT_MS, isMainListNavigableId } from './useHighlightLifecycle';

interface UseKeyboardNavigationHighlightExitArgs {
  visualFocusedItemId: string | null;
  visualExitingItemId: string | null;
  prevVisualOwnerRef: MutableRefObject<string | null>;
  exitTimerRef: MutableRefObject<number | null>;
  isHighlightSuppressed: boolean;
  isSearchActive: boolean;
  setVisualExitingItemId: Dispatch<SetStateAction<string | null>>;
}

export function useKeyboardNavigationHighlightExit({
  visualFocusedItemId,
  visualExitingItemId,
  prevVisualOwnerRef,
  exitTimerRef,
  isHighlightSuppressed,
  isSearchActive,
  setVisualExitingItemId,
}: UseKeyboardNavigationHighlightExitArgs) {
  const prevOwner = prevVisualOwnerRef.current;
  const syncVisualExitTargetId =
    prevOwner !== null && prevOwner !== visualFocusedItemId && isMainListNavigableId(prevOwner)
      ? prevOwner
      : null;
  prevVisualOwnerRef.current = visualFocusedItemId;

  useLayoutEffect(() => {
    if (isHighlightSuppressed || isSearchActive) {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setVisualExitingItemId(null);
      return;
    }

    if (!syncVisualExitTargetId) {
      return;
    }

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setVisualExitingItemId(syncVisualExitTargetId);
    exitTimerRef.current = window.setTimeout(() => {
      setVisualExitingItemId((current) => (current === syncVisualExitTargetId ? null : current));
      exitTimerRef.current = null;
    }, HIGHLIGHT_EXIT_MS);
  }, [
    exitTimerRef,
    isHighlightSuppressed,
    isSearchActive,
    setVisualExitingItemId,
    syncVisualExitTargetId,
  ]);

  return syncVisualExitTargetId ?? visualExitingItemId;
}
