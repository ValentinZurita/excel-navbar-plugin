import type { ReactNode } from 'react';

interface TaskpaneShellProps {
  children: ReactNode;
  errorMessage: string | null;
}

export function TaskpaneShell({ children, errorMessage }: TaskpaneShellProps) {
  return (
    <main className="taskpane-shell">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      <section className="taskpane-content">{children}</section>
    </main>
  );
}
