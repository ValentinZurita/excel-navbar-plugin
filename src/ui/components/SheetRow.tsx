import type { WorksheetEntity } from '../../domain/navigation/types';

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

function PinIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`sheet-pin-icon ${pinned ? 'sheet-pin-icon-active' : ''}`}
      fill="currentColor"
    >
      <path d="M10.1221 3.13715C10.7326 1.91616 12.3599 1.65208 13.3251 2.61737L17.382 6.67419C18.3472 7.63947 18.0832 9.26676 16.8622 9.87726L13.4037 11.6065C13.0751 11.7708 12.8183 12.0499 12.6818 12.391L11.2459 15.981C10.9792 16.6476 10.1179 16.8244 9.61027 16.3167L7 13.7064L3.70711 16.9993H3V16.2922L6.29289 12.9993L3.68262 10.3891C3.17498 9.88142 3.35177 9.02011 4.01834 8.75348L7.60829 7.3175C7.94939 7.18106 8.22855 6.92419 8.39285 6.5956L10.1221 3.13715ZM12.618 3.32447C12.1354 2.84183 11.3217 2.97387 11.0165 3.58437L9.28727 7.04282C9.01345 7.59046 8.54818 8.01858 7.97968 8.24598L4.38973 9.68196L10.3174 15.6096L11.7534 12.0197C11.9808 11.4512 12.4089 10.9859 12.9565 10.7121L16.415 8.98283C17.0255 8.67758 17.1575 7.86394 16.6749 7.3813L12.618 3.32447Z" />
    </svg>
  );
}

export function SheetRow({
  worksheet,
  isActive,
  isContextMenuOpen,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
}: SheetRowProps) {
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
