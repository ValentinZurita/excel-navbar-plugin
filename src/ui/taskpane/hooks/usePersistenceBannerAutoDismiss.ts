import { useCallback, useEffect, useRef } from 'react';
import type { BannerState } from '../../../domain/navigation/types';

/** Persistence warnings should linger longer than the undo snack; user can still dismiss early. */
export const PERSISTENCE_BANNER_AUTO_DISMISS_MS = 14_000;

/**
 * Auto-clears the persistence banner after a fixed delay while the controller still owns truth.
 */
export function usePersistenceBannerAutoDismiss(
  banner: BannerState | null,
  dismissBanner: () => void,
): void {
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();
    if (!banner) {
      return undefined;
    }
    timerRef.current = window.setTimeout(() => {
      dismissBanner();
      timerRef.current = null;
    }, PERSISTENCE_BANNER_AUTO_DISMISS_MS);
    return () => clearTimer();
  }, [banner, dismissBanner, clearTimer]);
}
