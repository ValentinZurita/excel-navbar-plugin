import { useCallback, type MutableRefObject } from 'react';

interface UseKeyboardNavigationIdleLifecycleArgs {
  idleClearTimeoutRef: MutableRefObject<number | null>;
  clearFocus: () => void;
  idleTimeoutMs: number;
}

export function useKeyboardNavigationIdleLifecycle({
  idleClearTimeoutRef,
  clearFocus,
  idleTimeoutMs,
}: UseKeyboardNavigationIdleLifecycleArgs) {
  const clearIdleTimeout = useCallback(() => {
    if (idleClearTimeoutRef.current !== null) {
      window.clearTimeout(idleClearTimeoutRef.current);
      idleClearTimeoutRef.current = null;
    }
  }, [idleClearTimeoutRef]);

  const scheduleIdleClear = useCallback(() => {
    clearIdleTimeout();
    idleClearTimeoutRef.current = window.setTimeout(() => {
      clearFocus();
      idleClearTimeoutRef.current = null;
    }, idleTimeoutMs);
  }, [clearFocus, clearIdleTimeout, idleClearTimeoutRef, idleTimeoutMs]);

  const markKeyboardActivity = useCallback(() => {
    scheduleIdleClear();
  }, [scheduleIdleClear]);

  return { clearIdleTimeout, scheduleIdleClear, markKeyboardActivity };
}
