import { useEffect, useRef } from 'react';
import type { SearchResultItem } from '../../../domain/navigation/types';
import { SearchBar } from '../SearchBar';
import { SearchResults } from '../SearchResults';
import './SearchBox.css';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  results: SearchResultItem[];
  onSelect: (worksheetId: string) => void | Promise<void>;
}

export function SearchBox({ value, onChange, results, onSelect }: SearchBoxProps) {
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
      <SearchBar value={value} onChange={onChange} />
      {value ? (
        <div className="search-results-wrapper">
          <SearchResults results={results} onSelect={onSelect} />
        </div>
      ) : null}
    </div>
  );
}
