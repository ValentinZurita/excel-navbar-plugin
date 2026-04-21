import { useEffect, useRef, type KeyboardEventHandler } from 'react';
import type { SearchResultItem } from '../../../domain/navigation/types';
import { SearchBar } from '../SearchBar';
import { SearchResults } from '../SearchResults';
import './SearchBox.css';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  results: SearchResultItem[];
  /** Current workbook active sheet; its title is emphasized in the dropdown (same green as list rows). */
  activeWorksheetId?: string | null;
  onSelect: (worksheetId: string) => void | Promise<void>;
  /** Ref to the search input for programmatic focus */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Handler for keyboard navigation from search input */
  onSearchKeyDown: KeyboardEventHandler<HTMLInputElement>;
  /** Currently focused item ID for visual focus indicator */
  focusedItemId: string | null;
  /** Strong highlight owner (e.g. sheet context menu target while searching) */
  visualFocusedItemId?: string | null;
  /** While a sheet context menu is open, search rows stay out of the tab order */
  sheetContextMenuOpen?: boolean;
  /** Current focus source to avoid visual double-highlight in search rows */
  navigationInputMode?: 'keyboard' | 'pointer' | null;
  /** Handler for keyboard navigation on search results */
  onResultKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>, itemId: string) => void;
  /** Register DOM element for focus management */
  registerElement?: (id: string, element: HTMLElement | null) => void;
  /** Update focused result from mouse hover/pointer movement */
  onResultPointerFocus?: (itemId: string) => void;
}

/**
 * Search box with dropdown results.
 *
 * Integrates with keyboard navigation:
 * - ArrowDown from input moves focus to first result
 * - Tab with matches autocompletes the first result name (Excel-style)
 * - Tab with no matches keeps focus in the search field (avoids jumping to the sheet list)
 * - Escape clears search
 * - Click outside closes dropdown
 */
export function SearchBox({
  value,
  onChange,
  results,
  activeWorksheetId = null,
  onSelect,
  inputRef,
  onSearchKeyDown,
  focusedItemId,
  visualFocusedItemId = null,
  sheetContextMenuOpen = false,
  navigationInputMode = null,
  onResultKeyDown,
  registerElement,
  onResultPointerFocus,
}: SearchBoxProps) {
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!value) {
      return undefined;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!searchBoxRef.current?.contains(event.target as Node)) {
        onChange('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onChange('');
      }
    }

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onChange, value]);

  return (
    <div className="search-box" ref={searchBoxRef}>
      <SearchBar 
        ref={inputRef} 
        value={value} 
        onChange={onChange} 
        onKeyDown={(event) => {
          if (event.key === 'Tab' && results.length > 0) {
            event.preventDefault();
            onChange(results[0].name);
            return;
          }
          if (
            event.key === 'Tab'
            && !event.shiftKey
            && value.trim().length > 0
            && results.length === 0
          ) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onSearchKeyDown?.(event as any);
        }} 
      />
      {value ? (
        <div className="search-results-wrapper" data-navigation-input-mode={navigationInputMode ?? 'none'}>
          <SearchResults
            results={results}
            activeWorksheetId={activeWorksheetId}
            onSelect={onSelect}
            focusedItemId={focusedItemId}
            visualFocusedItemId={visualFocusedItemId}
            sheetContextMenuOpen={sheetContextMenuOpen}
            navigationInputMode={navigationInputMode}
            onItemKeyDown={onResultKeyDown}
            registerElement={registerElement}
            onPointerFocus={onResultPointerFocus}
          />
        </div>
      ) : null}
    </div>
  );
}
