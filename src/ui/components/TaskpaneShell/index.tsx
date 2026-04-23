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
  return (
    <main className="taskpane-shell">
      {banner ? <StatusBanner banner={banner} onDismiss={onDismissBanner} /> : null}
      {toast ? <div className="taskpane-toast-slot">{toast}</div> : null}
      {children}
    </main>
  );
}
