import type { WorksheetEntity } from '../../domain/navigation/types';
import { ChevronDownIcon, ChevronRightIcon, EyeIcon } from '../icons';
import './HiddenSection.css';
import './Section.css';

interface HiddenSectionProps {
  isCollapsed: boolean;
  worksheets: WorksheetEntity[];
  onToggle: () => void;
  onUnhide: (worksheetId: string) => void | Promise<void>;
  onOpenContextMenu: (args: {
    target: HTMLElement;
    x: number;
    y: number;
    worksheet: WorksheetEntity;
  }) => void;
}

export function HiddenSection({ isCollapsed, worksheets, onToggle, onUnhide, onOpenContextMenu }: HiddenSectionProps) {
  return (
    <section className="section-card hidden-section">
      <header className="section-header section-header-clickable" onClick={onToggle}>
        <div className="section-copy inline-header">
          <span className="inline-chevron">
            {isCollapsed ? <ChevronRightIcon width="12" height="12" /> : <ChevronDownIcon width="12" height="12" />}
          </span>
          <h2>Hidden</h2>
        </div>
      </header>

      {!isCollapsed ? (
        // Hidden worksheets still support context menu actions (rename, move, etc.).
        <div className="sheet-list section-body">
          {worksheets.map((worksheet) => {
            const isVeryHidden = worksheet.visibility === 'VeryHidden';
            return (
              <article
                key={worksheet.worksheetId}
                className="sheet-row hidden-row"
                onContextMenu={(event) => {
                  event.preventDefault();
                  onOpenContextMenu({
                    target: event.currentTarget,
                    x: event.clientX,
                    y: event.clientY,
                    worksheet,
                  });
                }}
              >
                <div className="row-topline">
                  <button
                    className="sheet-unhide-button"
                    type="button"
                    disabled={isVeryHidden}
                    aria-label={`Unhide ${worksheet.name}`}
                    title={isVeryHidden ? 'Cannot unhide VeryHidden sheet' : `Unhide ${worksheet.name}`}
                    onClick={() => onUnhide(worksheet.worksheetId)}
                  >
                    <EyeIcon className="sheet-pin-icon sheet-unhide-icon" />
                  </button>
                  <div className="hidden-sheet-content">
                    <span className="sheet-title" style={{ opacity: isVeryHidden ? 0.6 : 1 }}>
                      {worksheet.name}
                    </span>
                    {isVeryHidden && <small>Very Hidden</small>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
