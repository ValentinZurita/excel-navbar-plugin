import type { BannerState } from '../../../domain/navigation/types';
import './StatusBanner.css';

interface StatusBannerProps {
  banner: BannerState;
  onDismiss?: () => void;
}

export function StatusBanner({ banner, onDismiss }: StatusBannerProps) {
  return (
    <section
      className={`status-banner status-banner-${banner.tone}`}
      role="status"
      aria-live="polite"
      aria-label={banner.message}
    >
      <span className="status-banner-message">{banner.message}</span>
      {onDismiss ? (
        <button
          type="button"
          className="status-banner-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      ) : null}
    </section>
  );
}
