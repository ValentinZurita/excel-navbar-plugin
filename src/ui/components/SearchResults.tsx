import type { SearchResultItem } from '../../domain/navigation/types';
import { EyeOffIcon, WorksheetIcon, WorksheetPinIcon } from '../icons';

interface SearchResultsProps {
  results: SearchResultItem[];
  onSelect: (worksheetId: string) => void | Promise<void>;
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  function getResultMeta(result: SearchResultItem) {
    const parts = [
      result.isPinned ? 'Pinned' : null,
      result.visibility !== 'Visible' ? (result.visibility === 'Hidden' ? 'Hidden' : 'Very hidden') : null,
      result.groupName,
    ].filter(Boolean);

    return parts.length ? parts.join(' · ') : null;
  }

  function renderResultIcon(result: SearchResultItem) {
    if (result.visibility !== 'Visible') {
      return <EyeOffIcon className="search-result-icon" />;
    }

    if (result.isPinned) {
      return <WorksheetPinIcon className="search-result-icon" />;
    }

    return <WorksheetIcon className="search-result-icon" />;
  }

  return (
    <section className="section-card search-results">
      <div className="sheet-list">
        {results.map((result) => {
          const meta = getResultMeta(result);

          return (
            <button key={result.worksheetId} className="search-result" type="button" onClick={() => onSelect(result.worksheetId)}>
              <span className="search-result-leading" aria-hidden="true">
                {renderResultIcon(result)}
              </span>
              <span className="search-result-copy">
                <span className="sheet-title">{result.name}</span>
                {meta ? <small className="search-result-meta">{meta}</small> : null}
              </span>
            </button>
          );
        })}
        {!results.length ? <p className="empty-state">No matching sheets.</p> : null}
      </div>
    </section>
  );
}
