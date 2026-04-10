import type { SearchResultItem } from '../../domain/navigation/types';

interface SearchResultsProps {
  results: SearchResultItem[];
  onSelect: (worksheetId: string) => void | Promise<void>;
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  return (
    <section className="section-card search-results">
      <div className="sheet-list">
        {results.map((result) => (
          <button key={result.worksheetId} className="search-result" type="button" onClick={() => onSelect(result.worksheetId)}>
            <span className="sheet-title">{result.name}</span>
            {(result.visibility !== 'Visible' || result.groupName) ? (
              <small className="search-result-meta">
                {result.visibility !== 'Visible' ? (result.visibility === 'Hidden' ? 'Hidden' : 'Very hidden') : result.groupName}
              </small>
            ) : null}
          </button>
        ))}
        {!results.length ? <p className="empty-state">No matching sheets.</p> : null}
      </div>
    </section>
  );
}
