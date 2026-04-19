import { useEffect, useRef } from 'react';
import type { SearchResultItem } from '../../../domain/navigation/types';
import { EyeOffIcon, GroupFolderIcon, WorksheetIcon, WorksheetPinIcon } from '../../icons';

interface SearchResultsProps {
  results: SearchResultItem[];
  onSelect: (worksheetId: string) => void | Promise<void>;
  /** Currently focused item ID for visual focus indicator */
  focusedItemId: string | null;
  /** Current focus source to avoid double highlight with pointer hover */
  navigationInputMode?: 'keyboard' | 'pointer' | null;
  /** Handler for keyboard navigation on individual results */
  onItemKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>, itemId: string) => void;
  /** Register DOM element for focus management */
  registerElement?: (id: string, element: HTMLElement | null) => void;
  /** Update focused result from mouse hover/pointer movement */
  onPointerFocus?: (itemId: string) => void;
}

/**
 * Renders search results as a list of buttons.
 *
 * Each result is a navigable item that:
 * - Has data-navigable-id for keyboard navigation
 * - Shows visual focus indicator when focusedItemId matches
 * - Registers its DOM element for programmatic focus
 */
export function SearchResults({
  results,
  onSelect,
  focusedItemId,
  navigationInputMode = null,
  onItemKeyDown,
  registerElement,
  onPointerFocus,
}: SearchResultsProps) {
  // Track last known physical mouse coordinates. This prevents "ghost hovers"
  // from stationary pointers during list scrolling (e.g. from ArrowDown focus tracking
  // or trackpad scrolling), which would otherwise accidentally update the keyboard anchor state.
  const lastMousePositionRef = useRef({ x: -1, y: -1 });

  const handlePointerFocus = (itemId: string, event: React.MouseEvent) => {
    if (
      event.clientX === lastMousePositionRef.current.x &&
      event.clientY === lastMousePositionRef.current.y
    ) {
      return; // Ignore synthetic events caused by elements sliding under a stationary cursor
    }
    
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
    onPointerFocus?.(itemId);
  };
  function renderResultIcon(result: SearchResultItem) {
    if (result.visibility !== 'Visible') {
      return <EyeOffIcon className="search-result-icon search-result-icon-hidden" />;
    }

    if (result.isGrouped) {
      const colorClass = result.groupColor && result.groupColor !== 'none'
        ? `group-leading-${result.groupColor}`
        : '';
        
      return <GroupFolderIcon className={`search-result-icon search-result-icon-group ${colorClass}`.trim()} />;
    }

    if (result.isPinned) {
      return <WorksheetPinIcon className="search-result-icon search-result-icon-pinned" />;
    }

    return <WorksheetIcon className="search-result-icon search-result-icon-worksheet" />;
  }

  return (
    <section className="section-card search-results">
      <div className="sheet-list">
        {results.map((result) => {
          const itemId = `search:${result.worksheetId}`;
          const isFocused = focusedItemId === itemId;

          return (
            <SearchResultItemComponent
              key={result.worksheetId}
              result={result}
              itemId={itemId}
              isFocused={isFocused}
              isPointerModeActive={navigationInputMode === 'pointer'}
              onSelect={onSelect}
              onItemKeyDown={onItemKeyDown}
              registerElement={registerElement}
              onPointerFocus={onPointerFocus ? handlePointerFocus : undefined}
              renderIcon={renderResultIcon}
            />
          );
        })}
        {!results.length ? <p className="empty-state">No results</p> : null}
      </div>
    </section>
  );
}

interface SearchResultItemComponentProps {
  result: SearchResultItem;
  itemId: string;
  isFocused: boolean;
  isPointerModeActive: boolean;
  onSelect: (worksheetId: string) => void | Promise<void>;
  onItemKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>, itemId: string) => void;
  registerElement?: (id: string, element: HTMLElement | null) => void;
  onPointerFocus?: (itemId: string, event: React.MouseEvent) => void;
  renderIcon: (result: SearchResultItem) => React.ReactNode;
}

function SearchResultItemComponent({
  result,
  itemId,
  isFocused,
  isPointerModeActive,
  onSelect,
  onItemKeyDown,
  registerElement,
  onPointerFocus,
  renderIcon,
}: SearchResultItemComponentProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Register DOM element for focus management
  useEffect(() => {
    if (registerElement) {
      registerElement(itemId, buttonRef.current);
    }

    return () => {
      if (registerElement) {
        registerElement(itemId, null);
      }
    };
  }, [itemId, registerElement]);

  return (
    <button
      ref={buttonRef}
      className="search-result"
      type="button"
      data-navigable-id={itemId}
      data-focused={isFocused}
      data-pointer-mode-active={isPointerModeActive}
      tabIndex={isFocused ? 0 : -1}
      onClick={() => onSelect(result.worksheetId)}
      onKeyDown={(event) => onItemKeyDown?.(event, itemId)}
      onMouseMove={(event) => onPointerFocus?.(itemId, event)}
      onMouseEnter={(event) => onPointerFocus?.(itemId, event)}
    >
      <span className={`search-result-leading ${result.groupColor && result.groupColor !== 'none' ? `group-color-${result.groupColor}` : ''}`.trim()} aria-hidden="true">
        {renderIcon(result)}
      </span>
      <span className="search-result-copy">
        <span className="sheet-title">{result.name}</span>
        {result.groupName ? <small className="search-result-meta">{result.groupName}</small> : null}
      </span>
    </button>
  );
}
