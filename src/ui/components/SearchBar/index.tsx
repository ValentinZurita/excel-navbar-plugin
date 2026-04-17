import { forwardRef } from 'react';
import { SearchIcon } from '../../icons';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

/**
 * Search input field with icon.
 *
 * Supports ref forwarding for programmatic focus management
 * and onKeyDown for keyboard navigation handling (e.g., ArrowDown to results).
 */
export const SearchBar = forwardRef<HTMLInputElement | null, SearchBarProps>(
  ({ value, onChange, onKeyDown }, ref) => {
    return (
      // This field drives both local search filtering and dropdown visibility.
      <label className="search-field">
        <span className="search-icon" aria-hidden="true">
          <SearchIcon className="search-icon-svg" />
        </span>
        <input
          ref={ref}
          type="text"
          placeholder=""
          aria-label="Search worksheets"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
        />
      </label>
    );
  },
);

SearchBar.displayName = 'SearchBar';
