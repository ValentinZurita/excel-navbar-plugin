import { useLayoutEffect, type MutableRefObject } from 'react';

interface UseKeyboardNavigationCleanupArgs {
  clearIdleTimeout: () => void;
  pendingFocusRestoreAfterSearchClearRef: MutableRefObject<boolean>;
  exitTimerRef: MutableRefObject<number | null>;
}

export function useKeyboardNavigationCleanup({
  clearIdleTimeout,
  pendingFocusRestoreAfterSearchClearRef,
  exitTimerRef,
}: UseKeyboardNavigationCleanupArgs) {
  useLayoutEffect(() => {
    return () => {
      clearIdleTimeout();
      pendingFocusRestoreAfterSearchClearRef.current = false;
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [clearIdleTimeout, exitTimerRef, pendingFocusRestoreAfterSearchClearRef]);
}
