import type { ReactNode } from 'react';
import type { BannerState } from '../../../domain/navigation/types';

interface TaskpaneShellProps {
  children: ReactNode;
  banner: BannerState | null;
}

export function TaskpaneShell({ children, banner }: TaskpaneShellProps) {
  return (
    <main className="taskpane-shell">
      {banner ? <div className={`status-banner status-banner-${banner.tone}`}>{banner.message}</div> : null}
      <section className="taskpane-content">{children}</section>
    </main>
  );
}
