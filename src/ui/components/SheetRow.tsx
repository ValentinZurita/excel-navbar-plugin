import type { WorksheetEntity } from '../../domain/navigation/types';

interface SheetRowProps {
  worksheet: WorksheetEntity;
  isActive: boolean;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onTogglePin?: (worksheetId: string) => void;
  onOpenContextMenu: (args: {
    target: HTMLElement;
    worksheet: WorksheetEntity;
  }) => void;
}

function PinIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`sheet-pin-icon ${pinned ? 'sheet-pin-icon-active' : ''}`}
      fill={pinned ? 'currentColor' : 'none'}
      stroke="currentColor"
    >
      <path
        d="M12 17v5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.8l-1.78-.89a2 2 0 0 1-1.11-1.79V5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v5.76z"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SheetRow({
  worksheet,
  isActive,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
}: SheetRowProps) {
  const canTogglePin = worksheet.groupId === null && worksheet.visibility === 'Visible' && Boolean(onTogglePin);

  return (
    <article
      className={`sheet-row ${isActive ? 'sheet-row-active' : ''} ${worksheet.groupId ? 'sheet-row-grouped' : 'sheet-row-standalone'}`}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenContextMenu({
          target: event.currentTarget,
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
            <PinIcon pinned={worksheet.isPinned} />
          </button>
        ) : worksheet.groupId ? <span className="sheet-indent-slot" aria-hidden="true" /> : null}

        <button className="sheet-link" type="button" onClick={() => onActivate(worksheet.worksheetId)}>
          <span className="sheet-title">{worksheet.name}</span>
        </button>
      </div>
    </article>
  );
}
