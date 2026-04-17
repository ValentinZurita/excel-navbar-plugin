import { useEffect, useRef, type KeyboardEventHandler, type RefObject } from 'react';
import type { SearchResultItem } from '../../../domain/navigation/types';
import { SearchBar } from '../SearchBar';
import { SearchResults } from '../SearchResults';
import './SearchBox.css';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  results: SearchResultItem[];
  onSelect: (worksheetId: string) => void | Promise<void>;
  /** Ref to the search input for programmatic focus */
  inputRef: RefObject<HTMLInputElement | null>;
  /** Handler for keyboard navigation from search input */
  onSearchKeyDown: KeyboardEventHandler<HTMLInputElement>;
  /** Currently focused item ID for visual focus indicator */
  focusedItemId: string | null;
}

/**
 * Search box with dropdown results.
 *
 * Integrates with keyboard navigation:
 * - ArrowDown from input moves focus to first result
 * - Escape clears search
 * - Click outside closes dropdown
 */
export function SearchBox({
  value,
  onChange,
  results,
  onSelect,
  inputRef,
  onSearchKeyDown,
  focusedItemId,
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
      <SearchBar ref={inputRef} value={value} onChange={onChange} onKeyDown={onSearchKeyDown} />
      {value ? (
        <div className="search-results-wrapper">
          <SearchResults results={results} onSelect={onSelect} focusedItemId={focusedItemId} />
        </div>
      ) : null}
    </div>
  );
}
