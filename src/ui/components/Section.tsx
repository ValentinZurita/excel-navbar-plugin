import { useState, type ReactNode } from 'react';

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M5.64645 3.14645C5.45118 3.34171 5.45118 3.65829 5.64645 3.85355L9.79289 8L5.64645 12.1464C5.45118 12.3417 5.45118 12.6583 5.64645 12.8536C5.84171 13.0488 6.15829 13.0488 6.35355 12.8536L10.8536 8.35355C11.0488 8.15829 11.0488 7.84171 10.8536 7.64645L6.35355 3.14645C6.15829 2.95118 5.84171 2.95118 5.64645 3.14645Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L8 9.79289L12.1464 5.64645C12.3417 5.45118 12.6583 5.45118 12.8536 5.64645C13.0488 5.84171 13.0488 6.15829 12.8536 6.35355L8.35355 10.8536C8.15829 11.0488 7.84171 11.0488 7.64645 10.8536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z" />
    </svg>
  );
}

interface SectionProps {
  title: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

export function Section({ title, defaultCollapsed = false, children }: SectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className="section-card">
      <header className="section-header section-header-clickable" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="section-copy inline-header">
          <span className="inline-chevron">{isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}</span>
          <h2>{title}</h2>
        </div>
      </header>
      {!isCollapsed ? <div className="section-body">{children}</div> : null}
    </section>
  );
}
