import type { SearchResultItem } from '../../../domain/navigation/types';
import { EyeOffIcon, GroupFolderIcon, WorksheetIcon, WorksheetPinIcon } from '../../icons';

interface SearchResultsProps {
  results: SearchResultItem[];
  onSelect: (worksheetId: string) => void | Promise<void>;
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  function renderResultIcon(result: SearchResultItem) {
    if (result.visibility !== 'Visible') {
      return <EyeOffIcon className="search-result-icon search-result-icon-hidden" />;
    }

    if (result.isGrouped) {
      return <GroupFolderIcon className="search-result-icon search-result-icon-group" />;
    }

    if (result.isPinned) {
      return <WorksheetPinIcon className="search-result-icon search-result-icon-pinned" />;
    }

    return <WorksheetIcon className="search-result-icon search-result-icon-worksheet" />;
  }

  return (
    <section className="section-card search-results">
      <div className="sheet-list">
        {results.map((result) => (
          <button key={result.worksheetId} className="search-result" type="button" onClick={() => onSelect(result.worksheetId)}>
            <span className="search-result-leading" aria-hidden="true">
              {renderResultIcon(result)}
            </span>
            <span className="search-result-copy">
              <span className="sheet-title">{result.name}</span>
              {result.groupName ? <small className="search-result-meta">{result.groupName}</small> : null}
            </span>
          </button>
        ))}
        {!results.length ? <p className="empty-state">No results</p> : null}
      </div>
    </section>
  );
}
