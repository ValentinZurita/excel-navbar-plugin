import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import { EyeOffIcon, WorksheetIcon, WorksheetPinIcon } from '../../icons';
import { InlineRenameInput } from '../InlineRenameInput';
import './SheetRow.css';

type LeadingState = 'indicator' | 'pin-action' | 'pinned-indicator';

function hasNestedInteractiveTarget(target: EventTarget | null, currentTarget: HTMLElement) {
  if (!(target instanceof HTMLElement) || target === currentTarget) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const interactiveTarget = target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="textbox"]');
  return Boolean(interactiveTarget && currentTarget.contains(interactiveTarget));
}

interface SheetRowProps {
  worksheet: WorksheetEntity;
  isActive: boolean;
  isRenaming?: boolean;
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
  onRenameSubmit?: (worksheetId: string, newName: string) => void | Promise<void>;
  onRenameCancel?: () => void;
}

export function SheetRow({
  worksheet,
  isActive,
  isRenaming,
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
  onRenameSubmit,
  onRenameCancel,
}: SheetRowProps) {
  const { onKeyDown: onContainerKeyDown, ...restContainerProps } = containerProps ?? {};
  const isInteractive = !isOverlay;
  const canTogglePin = worksheet.visibility === 'Visible' && Boolean(onTogglePin);
  const isToggleable = canTogglePin;
  const isInteractiveHighlight = !isInteractionSuppressed && Boolean(isHovered);
  const isHighlighted = isActive || Boolean(isContextMenuOpen) || isInteractiveHighlight;
  const shouldShowPinAction =
    !worksheet.isPinned &&
    canTogglePin &&
    !isOverlay &&
    !isDragged &&
    !isInteractionSuppressed &&
    (Boolean(isContextMenuOpen) || isInteractiveHighlight);
  const leadingState: LeadingState = worksheet.isPinned
    ? 'pinned-indicator'
    : shouldShowPinAction
      ? 'pin-action'
      : 'indicator';

  function renderBaseIndicator() {
    if (worksheet.isPinned) {
      return (
        <span className="sheet-row-static-indicator" aria-hidden="true">
          <WorksheetPinIcon className="sheet-pin-icon sheet-pin-icon-active" />
        </span>
      );
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
      data-pin-visible={leadingState === 'pin-action' ? 'true' : 'false'}
      data-leading-state={leadingState}
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

        onContainerKeyDown?.(event);

        if (event.defaultPrevented || hasNestedInteractiveTarget(event.target, event.currentTarget)) {
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
        event.stopPropagation();
        onOpenContextMenu({
          target: event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          worksheet,
        });
      }}
      {...restContainerProps}
    >
      <div className="row-topline">
        <span className="sheet-row-leading" aria-hidden="true">
          {leadingState === 'pin-action' && canTogglePin ? (
            <button
              className="sheet-pin-button"
              type="button"
              aria-label={`Pin ${worksheet.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin?.(worksheet.worksheetId);
              }}
            >
              <WorksheetPinIcon className="sheet-pin-icon" />
            </button>
          ) : renderBaseIndicator()}
        </span>

        <div className="sheet-link">
          {isRenaming && onRenameSubmit ? (
            <InlineRenameInput
              initialValue={worksheet.name}
              onSubmit={(newName) => onRenameSubmit(worksheet.worksheetId, newName)}
              onCancel={onRenameCancel ?? (() => {})}
            />
          ) : (
            <span className="sheet-title">{worksheet.name}</span>
          )}
        </div>
      </div>
    </article>
  );
}
