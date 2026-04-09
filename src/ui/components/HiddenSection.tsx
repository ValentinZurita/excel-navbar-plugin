import type { WorksheetEntity } from '../../domain/navigation/types';

interface HiddenSectionProps {
  isCollapsed: boolean;
  worksheets: WorksheetEntity[];
  onToggle: () => void;
  onUnhide: (worksheetId: string) => void | Promise<void>;
}

export function HiddenSection({ isCollapsed, worksheets, onToggle, onUnhide }: HiddenSectionProps) {
  return (
    <section className="section-card hidden-section">
      <header className="section-header section-header-clickable" onClick={onToggle}>
        <div>
          <h2>Hidden sheets</h2>
        </div>
        <span className="toolbar-button">{isCollapsed ? '▸' : '▾'}</span>
      </header>

      {!isCollapsed ? (
        <div className="sheet-list">
          {worksheets.map((worksheet) => (
            <article key={worksheet.worksheetId} className="sheet-row hidden-row">
              <div>
                <span>{worksheet.name}</span>
                <small>{worksheet.visibility}</small>
              </div>
              <button
                className="chip-button"
                type="button"
                disabled={worksheet.visibility === 'VeryHidden'}
                onClick={() => onUnhide(worksheet.worksheetId)}
              >
                Unhide
              </button>
            </article>
          ))}
          {!worksheets.length ? <p className="empty-state">No hidden sheets</p> : null}
        </div>
      ) : null}
    </section>
  );
}
