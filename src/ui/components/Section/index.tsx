import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../../icons';
import './Section.css';

interface SectionHeaderProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  headerAccessory?: ReactNode;
  navigableId?: string;
  isFocused?: boolean;
  isVisualFocused?: boolean;
  isVisualExiting?: boolean;
  onHeaderKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  registerElement?: (id: string, element: HTMLElement | null) => void;
}

interface SectionProps {
  title: string;
  isCollapsed?: boolean;
  onToggle?: (isCollapsed: boolean) => void;
  defaultCollapsed?: boolean;
  headerAccessory?: ReactNode;
  navigableId?: string;
  isFocused?: boolean;
  isVisualFocused?: boolean;
  isVisualExiting?: boolean;
  onHeaderKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  registerElement?: (id: string, element: HTMLElement | null) => void;
  children: ReactNode;
}

const SECTION_HEADER_MANAGED_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowRight',
  'ArrowLeft',
  'Enter',
  ' ',
  'Home',
  'End',
  'Escape',
]);

export function SectionHeader({
  title,
  isCollapsed,
  onToggle,
  headerAccessory,
  navigableId,
  isFocused = false,
  isVisualFocused = false,
  isVisualExiting = false,
  onHeaderKeyDown,
  registerElement,
}: SectionHeaderProps) {
  const headerButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!navigableId || !registerElement) {
      return undefined;
    }

    registerElement(navigableId, headerButtonRef.current);
    return () => {
      registerElement(navigableId, null);
    };
  }, [navigableId, registerElement]);

  const tabIndex = navigableId ? (isFocused ? 0 : -1) : 0;

  return (
    <header className="section-header">
      <button
        ref={headerButtonRef}
        className="section-header-button section-header-clickable"
        type="button"
        aria-expanded={!isCollapsed}
        tabIndex={tabIndex}
        data-navigable-id={navigableId}
        data-focused={navigableId ? isFocused : undefined}
        data-visual-focused={navigableId ? isVisualFocused : undefined}
        data-visual-exiting={navigableId ? isVisualExiting : undefined}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (onHeaderKeyDown && SECTION_HEADER_MANAGED_KEYS.has(event.key)) {
            onHeaderKeyDown(event);
          }
        }}
      >
        <span className="section-header-nav-highlight" aria-hidden="true" />
        <span className="section-copy inline-header">
          <span className="inline-chevron">
            {isCollapsed ? (
              <ChevronRightIcon width="12" height="12" />
            ) : (
              <ChevronDownIcon width="12" height="12" />
            )}
          </span>
          <span className="section-title">{title}</span>
        </span>
      </button>

      {headerAccessory ? <span className="section-header-accessory">{headerAccessory}</span> : null}
    </header>
  );
}

export function Section({
  title,
  isCollapsed: controlledIsCollapsed,
  onToggle,
  defaultCollapsed = false,
  headerAccessory,
  navigableId,
  isFocused = false,
  isVisualFocused = false,
  isVisualExiting = false,
  onHeaderKeyDown,
  registerElement,
  children,
}: SectionProps) {
  // Local state fallback for uncontrolled usage
  const [localIsCollapsed, setLocalIsCollapsed] = useState(defaultCollapsed);

  const isCollapsed =
    controlledIsCollapsed !== undefined ? controlledIsCollapsed : localIsCollapsed;

  const handleToggle = () => {
    const nextState = !isCollapsed;
    if (controlledIsCollapsed === undefined) {
      setLocalIsCollapsed(nextState);
    }
    onToggle?.(nextState);
  };

  return (
    <section className="section-card">
      <SectionHeader
        title={title}
        isCollapsed={isCollapsed}
        onToggle={handleToggle}
        headerAccessory={headerAccessory}
        navigableId={navigableId}
        isFocused={isFocused}
        isVisualFocused={isVisualFocused}
        isVisualExiting={isVisualExiting}
        onHeaderKeyDown={onHeaderKeyDown}
        registerElement={registerElement}
      />
      {!isCollapsed ? <div className="section-body">{children}</div> : null}
    </section>
  );
}
