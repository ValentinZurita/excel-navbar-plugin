import { useCallback, useEffect, useRef, useState } from 'react';
import type { GroupEntity } from '../../../domain/navigation/types';

export const UNDO_TOAST_AUTO_DISMISS_MS = 7_000;

export interface UndoToastPayload {
  group: GroupEntity;
  worksheetId: string;
  orderIndex: number;
  message: string;
}

/**
 * Ephemeral undo snack after destructive group actions: schedule, dismiss, and timer cleanup.
 */
export function useUndoToastScheduler(): {
  undoToast: UndoToastPayload | null;
  scheduleUndoToast: (payload: UndoToastPayload) => void;
  dismissUndoToast: () => void;
} {
  const [undoToast, setUndoToast] = useState<UndoToastPayload | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissUndoToast = useCallback(() => {
    setUndoToast(null);
    clearTimer();
  }, [clearTimer]);

  const scheduleUndoToast = useCallback(
    (payload: UndoToastPayload) => {
      clearTimer();
      setUndoToast(payload);
      timerRef.current = window.setTimeout(() => {
        setUndoToast(null);
        timerRef.current = null;
      }, UNDO_TOAST_AUTO_DISMISS_MS);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { undoToast, scheduleUndoToast, dismissUndoToast };
}
