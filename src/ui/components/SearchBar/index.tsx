import { forwardRef } from 'react';
import { RemoveMenuIcon, SearchIcon } from '../../icons';
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
    const hasQuery = value.length > 0;

    return (
      // This field drives both local search filtering and dropdown visibility.
      <div className="search-field">
        {hasQuery ? (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onMouseDown={(event) => {
              // Keep focus in the input; blur would fight keyboard navigation.
              event.preventDefault();
            }}
            onClick={() => onChange('')}
          >
            <RemoveMenuIcon className="search-icon-svg" aria-hidden />
          </button>
        ) : (
          <span className="search-icon" aria-hidden="true">
            <SearchIcon className="search-icon-svg" />
          </span>
        )}
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
      </div>
    );
  },
);

SearchBar.displayName = 'SearchBar';
