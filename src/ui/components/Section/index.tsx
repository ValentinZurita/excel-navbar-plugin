import { useState, type ReactNode } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../../icons';
import './Section.css';

interface SectionProps {
  title: string;
  isCollapsed?: boolean;
  onToggle?: (isCollapsed: boolean) => void;
  defaultCollapsed?: boolean;
  headerAccessory?: ReactNode;
  children: ReactNode;
}

export function Section({ title, isCollapsed: controlledIsCollapsed, onToggle, defaultCollapsed = false, headerAccessory, children }: SectionProps) {
  // Local state fallback for uncontrolled usage
  const [localIsCollapsed, setLocalIsCollapsed] = useState(defaultCollapsed);

  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : localIsCollapsed;

  const handleToggle = () => {
    const nextState = !isCollapsed;
    if (controlledIsCollapsed === undefined) {
      setLocalIsCollapsed(nextState);
    }
    onToggle?.(nextState);
  };

  return (
    <section className="section-card">
      <header className="section-header section-header-clickable" onClick={handleToggle}>
        <div className="section-copy inline-header">
          <span className="inline-chevron">
            {isCollapsed ? <ChevronRightIcon width="12" height="12" /> : <ChevronDownIcon width="12" height="12" />}
          </span>
          <h2>{title}</h2>
          {headerAccessory ? <span className="section-header-accessory">{headerAccessory}</span> : null}
        </div>
      </header>
      {!isCollapsed ? <div className="section-body">{children}</div> : null}
    </section>
  );
}
