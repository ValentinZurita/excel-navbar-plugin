import type { WorksheetEntity } from '../../../domain/navigation/types';
import { WorksheetPinIcon } from '../../icons';
import './SheetRow.css';

interface SheetRowProps {
  worksheet: WorksheetEntity;
  isActive: boolean;
  isContextMenuOpen?: boolean;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onTogglePin?: (worksheetId: string) => void;
  onOpenContextMenu: (args: {
    target: HTMLElement;
    x: number;
    y: number;
    worksheet: WorksheetEntity;
  }) => void;
}

export function SheetRow({
  worksheet,
  isActive,
  isContextMenuOpen,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
}: SheetRowProps) {
  // Grouped rows do not expose pin action because grouping owns their position.
  const canTogglePin = worksheet.groupId === null && worksheet.visibility === 'Visible' && Boolean(onTogglePin);

  return (
    <article
      className={`sheet-row ${isActive ? 'sheet-row-active' : ''} ${isContextMenuOpen ? 'sheet-row-context-open' : ''} ${worksheet.groupId ? 'sheet-row-grouped' : 'sheet-row-standalone'}`}
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
        {canTogglePin ? (
          <button
            className={`sheet-pin-button ${worksheet.isPinned ? 'sheet-pin-button-active' : ''}`}
            type="button"
            aria-label={worksheet.isPinned ? `Unpin ${worksheet.name}` : `Pin ${worksheet.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onTogglePin?.(worksheet.worksheetId);
            }}
          >
            <WorksheetPinIcon className={`sheet-pin-icon ${worksheet.isPinned ? 'sheet-pin-icon-active' : ''}`} />
          </button>
        ) : worksheet.groupId ? <span className="sheet-indent-slot" aria-hidden="true" /> : null}

        <button className="sheet-link" type="button" onClick={() => onActivate(worksheet.worksheetId)}>
          <span className="sheet-title">{worksheet.name}</span>
        </button>
      </div>
    </article>
  );
}
