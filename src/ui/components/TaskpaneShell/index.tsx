import type { ReactNode } from 'react';
import type { BannerState } from '../../../domain/navigation/types';
import { StatusBanner } from '../StatusBanner';

interface TaskpaneShellProps {
  children: ReactNode;
  banner: BannerState | null;
  onDismissBanner?: () => void;
  toast?: ReactNode;
}

export function TaskpaneShell({ children, banner, onDismissBanner, toast }: TaskpaneShellProps) {
  const isDevHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost'));

  return (
    <main className="taskpane-shell">
      {isDevHost ? <div className="taskpane-dev-badge">DEV MODE · localhost</div> : null}
      {banner ? <StatusBanner banner={banner} onDismiss={onDismissBanner} /> : null}
      {toast ? <div className="taskpane-toast-slot">{toast}</div> : null}
      {children}
    </main>
  );
}
