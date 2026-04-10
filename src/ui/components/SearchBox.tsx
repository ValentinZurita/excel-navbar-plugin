import type { SearchResultItem } from '../../domain/navigation/types';
import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';
import './SearchBox.css';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  results: SearchResultItem[];
  onSelect: (worksheetId: string) => void | Promise<void>;
}

export function SearchBox({ value, onChange, results, onSelect }: SearchBoxProps) {
  return (
    <div className="search-box">
      <SearchBar value={value} onChange={onChange} />
      {value ? (
        <div className="search-results-wrapper">
          <SearchResults results={results} onSelect={onSelect} />
        </div>
      ) : null}
    </div>
  );
}
