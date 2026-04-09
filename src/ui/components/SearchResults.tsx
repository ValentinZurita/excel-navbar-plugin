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
            <span>{result.name}</span>
            {result.groupName ? <small>{result.groupName}</small> : <small>Ungrouped</small>}
          </button>
        ))}
        {!results.length ? <p className="empty-state">No matching sheets.</p> : null}
      </div>
    </section>
  );
}
