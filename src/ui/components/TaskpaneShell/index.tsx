import type { ReactNode } from 'react';
import type { BannerState } from '../../../domain/navigation/types';

interface TaskpaneShellProps {
  children: ReactNode;
  banner: BannerState | null;
  toast?: ReactNode;
}

export function TaskpaneShell({ children, banner, toast }: TaskpaneShellProps) {
  return (
    <main className="taskpane-shell">
      {banner ? <div className={`status-banner status-banner-${banner.tone}`}>{banner.message}</div> : null}
      {toast ? <div className="taskpane-toast-slot">{toast}</div> : null}
      <section className="taskpane-content">{children}</section>
    </main>
  );
}
