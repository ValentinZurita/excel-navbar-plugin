import { useState, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import { EyeOffIcon, WorksheetIcon, WorksheetPinIcon } from '../../icons';
import { InlineRenameInput } from '../InlineRenameInput';
import { resolveLeadingState, type LeadingState } from './resolveLeadingState';
import './SheetRow.css';

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
  isInteractionSuppressed?: boolean;
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
  isInteractionSuppressed,
  containerRef,
  containerStyle,
  containerProps,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
  onRenameSubmit,
  onRenameCancel,
}: SheetRowProps) {
  const { onKeyDown: onContainerKeyDown, ...restContainerProps } = containerProps ?? {};
  const [isLeadingHovered, setIsLeadingHovered] = useState(false);
  const [isLeadingFocused, setIsLeadingFocused] = useState(false);

  const isInteractive = !isOverlay;
  const canTogglePin = worksheet.visibility === 'Visible' && Boolean(onTogglePin);
  const isToggleable = canTogglePin;

  // Highlight state now only considers active/context, NOT hover for pin action
  const isHighlighted = isActive || Boolean(isContextMenuOpen);

  // Use pure function for leading state resolution
  const leadingState: LeadingState = resolveLeadingState({
    isPinned: worksheet.isPinned,
    visibility: worksheet.visibility,
    canTogglePin,
    isOverlay: Boolean(isOverlay),
    isDragged: Boolean(isDragged),
    isInteractionSuppressed: Boolean(isInteractionSuppressed),
    isContextMenuOpen: Boolean(isContextMenuOpen),
    isLeadingHovered,
    isLeadingFocused,
  });

  function renderBaseIndicator() {
    // Pinned sheets: always show pin icon as base, unpin button overlays it
    // This prevents flash when swapping content during transition
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
      data-context-open={isContextMenuOpen ? 'true' : 'false'}
      data-pin-visible={(leadingState === 'pin-action' || leadingState === 'unpin-action') ? 'true' : 'false'}
      data-leading-state={leadingState}
      data-interaction-suppressed={isInteractionSuppressed ? 'true' : 'false'}
      style={containerStyle}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : -1}
      aria-hidden={isInteractive ? undefined : true}
      aria-label={worksheet.name}
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
        <span
          className="sheet-row-leading"
          aria-hidden="true"
          onPointerEnter={() => setIsLeadingHovered(true)}
          onPointerLeave={(e) => {
            // Only clear hover if leaving to outside the leading cluster (not to child button)
            const relatedTarget = e.relatedTarget;
            const currentTarget = e.currentTarget;
            // Guard against invalid relatedTarget in jsdom/testing environments
            if (!relatedTarget || !(relatedTarget instanceof Node)) {
              setIsLeadingHovered(false);
              return;
            }
            if (!currentTarget.contains(relatedTarget)) {
              setIsLeadingHovered(false);
            }
          }}
        >
          {/* Base indicator - always rendered but visually hidden when action is shown */}
          <span className={`sheet-row-base-indicator ${leadingState === 'indicator' || leadingState === 'pinned-indicator' ? 'sheet-row-base-indicator-visible' : ''}`}>
            {renderBaseIndicator()}
          </span>
          
          {/* Pin button - always rendered but visually hidden when not in action state */}
          {canTogglePin && (
            <button
              className={`sheet-pin-button ${leadingState === 'pin-action' || leadingState === 'unpin-action' ? 'sheet-pin-button-visible' : ''} ${leadingState === 'unpin-action' ? 'sheet-pin-button-active' : ''}`}
              type="button"
              aria-label={leadingState === 'unpin-action' ? `Unpin ${worksheet.name}` : `Pin ${worksheet.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin?.(worksheet.worksheetId);
              }}
              onFocus={() => setIsLeadingFocused(true)}
              onBlur={() => setIsLeadingFocused(false)}
            >
              <WorksheetPinIcon className={`sheet-pin-icon ${leadingState === 'unpin-action' ? 'sheet-pin-icon-active' : ''}`} />
            </button>
          )}
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
