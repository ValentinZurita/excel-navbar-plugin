import { SearchIcon } from '../icons';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    // This field drives both local search filtering and dropdown visibility.
    <label className="search-field">
      <span className="search-icon" aria-hidden="true">
        <SearchIcon className="search-icon-svg" />
      </span>
      <input
        type="text"
        placeholder=""
        aria-label="Search worksheets"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </label>
  );
}
