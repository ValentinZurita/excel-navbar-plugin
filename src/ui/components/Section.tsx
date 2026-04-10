import { useState, type ReactNode } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../icons';
import './Section.css';

interface SectionProps {
  title: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

export function Section({ title, defaultCollapsed = false, children }: SectionProps) {
  // Generic collapsible block used by pinned/sheets/groups sections.
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className="section-card">
      <header className="section-header section-header-clickable" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="section-copy inline-header">
          <span className="inline-chevron">
            {isCollapsed ? <ChevronRightIcon width="12" height="12" /> : <ChevronDownIcon width="12" height="12" />}
          </span>
          <h2>{title}</h2>
        </div>
      </header>
      {!isCollapsed ? <div className="section-body">{children}</div> : null}
    </section>
  );
}
