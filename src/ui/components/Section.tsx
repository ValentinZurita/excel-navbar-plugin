import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <section className="section-card">
      <header className="section-header">
        <div className="section-copy">
          <h2>{title}</h2>
        </div>
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
}
