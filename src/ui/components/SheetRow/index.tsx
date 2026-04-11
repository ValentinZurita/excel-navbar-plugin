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
  isHovered?: boolean;
  isInteractionSuppressed?: boolean;
  containerRef?: Ref<HTMLElement>;
  containerStyle?: CSSProperties;
  containerProps?: HTMLAttributes<HTMLElement>;
  onHoverChange?: (worksheetId: string | null) => void;
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
  isHovered,
  isInteractionSuppressed,
  containerRef,
  containerStyle,
  containerProps,
  onHoverChange,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
}: SheetRowProps) {
  const isInteractive = !isOverlay;
  const canTogglePin = worksheet.visibility === 'Visible' && Boolean(onTogglePin);
  const isToggleable = canTogglePin;
  const isInteractiveHighlight = !isInteractionSuppressed && Boolean(isHovered);
  const isHighlighted = isActive || Boolean(isContextMenuOpen) || isInteractiveHighlight;
  const isPinVisible =
    Boolean(worksheet.isPinned) || Boolean(isContextMenuOpen) || (canTogglePin && isInteractiveHighlight);

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
      data-active={isActive ? 'true' : 'false'}
      data-highlighted={isHighlighted ? 'true' : 'false'}
      data-hovered={isHovered ? 'true' : 'false'}
      data-context-open={isContextMenuOpen ? 'true' : 'false'}
      data-pin-visible={isPinVisible ? 'true' : 'false'}
      data-interaction-suppressed={isInteractionSuppressed ? 'true' : 'false'}
      style={containerStyle}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : -1}
      aria-hidden={isInteractive ? undefined : true}
      aria-label={worksheet.name}
      onPointerEnter={() => {
        if (isInteractive && !isInteractionSuppressed) {
          onHoverChange?.(worksheet.worksheetId);
        }
      }}
      onPointerLeave={() => {
        if (isInteractive) {
          onHoverChange?.(null);
        }
      }}
      onClick={() => {
        if (isInteractive) {
          void onActivate(worksheet.worksheetId);
        }
      }}
      onKeyDown={(event) => {
        if (!isInteractive) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void onActivate(worksheet.worksheetId);
        }
      }}
      onContextMenu={(event) => {
        if (!isInteractive) {
          return;
        }

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
