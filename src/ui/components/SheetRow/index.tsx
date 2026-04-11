import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import { EyeOffIcon, WorksheetIcon, WorksheetPinIcon } from '../../icons';
import './SheetRow.css';

interface SheetRowProps {
  worksheet: WorksheetEntity;
  isActive: boolean;
  isContextMenuOpen?: boolean;
  isDragged?: boolean;
  isOverlay?: boolean;
  containerRef?: Ref<HTMLElement>;
  containerStyle?: CSSProperties;
  containerProps?: HTMLAttributes<HTMLElement>;
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
  isDragged,
  isOverlay,
  containerRef,
  containerStyle,
  containerProps,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
}: SheetRowProps) {
  const canTogglePin = worksheet.groupId === null && worksheet.visibility === 'Visible' && Boolean(onTogglePin);
  const isToggleable = canTogglePin;

  function renderRowIcon() {
    if (worksheet.isPinned) {
      return null;
    }

    if (worksheet.visibility !== 'Visible') {
      return <EyeOffIcon className="sheet-row-icon" />;
    }

    return <WorksheetIcon className="sheet-row-icon" />;
  }

  return (
    <article
      ref={containerRef}
      className={`sheet-row ${isActive ? 'sheet-row-active' : ''} ${isContextMenuOpen ? 'sheet-row-context-open' : ''} ${isToggleable ? 'sheet-row-pin-toggleable' : ''} ${worksheet.groupId ? 'sheet-row-grouped' : 'sheet-row-standalone'} ${isDragged ? 'sheet-row-dragging' : ''} ${isOverlay ? 'sheet-row-overlay' : ''}`}
      style={containerStyle}
      role="button"
      tabIndex={0}
      aria-label={worksheet.name}
      onClick={() => void onActivate(worksheet.worksheetId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void onActivate(worksheet.worksheetId);
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenContextMenu({
          target: event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          worksheet,
        });
      }}
      {...containerProps}
    >
      <div className="row-topline">
        <span className="sheet-row-leading" aria-hidden="true">
          {renderRowIcon()}
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
          ) : null}
        </span>

        <div className="sheet-link">
          <span className="sheet-title">{worksheet.name}</span>
        </div>
      </div>
    </article>
  );
}
