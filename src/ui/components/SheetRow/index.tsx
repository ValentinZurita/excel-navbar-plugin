import { memo, useEffect, useState, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
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
  /** Optional: ID for keyboard navigation. When provided, participates in arrow key navigation. */
  navigableId?: string;
  /** Whether this row has keyboard focus (from navigation context) */
  isFocused?: boolean;
  /** Handler for keyboard navigation (from navigation context) */
  onItemKeyDown?: (event: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  /** Register DOM element for focus management (from navigation context) */
  registerElement?: (id: string, element: HTMLElement | null) => void;
}

function areSheetRowPropsEqual(left: SheetRowProps, right: SheetRowProps) {
  return left.worksheet === right.worksheet
    && left.isActive === right.isActive
    && left.isRenaming === right.isRenaming
    && left.isContextMenuOpen === right.isContextMenuOpen
    && left.isDragged === right.isDragged
    && left.isOverlay === right.isOverlay
    && left.isInteractionSuppressed === right.isInteractionSuppressed
    && left.containerRef === right.containerRef
    && left.containerStyle === right.containerStyle
    && left.containerProps === right.containerProps
    && left.onActivate === right.onActivate
    && left.onTogglePin === right.onTogglePin
    && left.onOpenContextMenu === right.onOpenContextMenu
    && left.onRenameSubmit === right.onRenameSubmit
    && left.onRenameCancel === right.onRenameCancel
    && left.navigableId === right.navigableId
    && left.isFocused === right.isFocused
    && left.onItemKeyDown === right.onItemKeyDown
    && left.registerElement === right.registerElement;
}

function SheetRowComponent({
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
  navigableId,
  isFocused = false,
  onItemKeyDown,
  registerElement,
}: SheetRowProps) {
  const { onKeyDown: onContainerKeyDown, ...restContainerProps } = containerProps ?? {};
  const [isLeadingHovered, setIsLeadingHovered] = useState(false);
  const [isLeadingFocused, setIsLeadingFocused] = useState(false);

  // Register DOM element for focus management when navigableId is provided
  useEffect(() => {
    if (!navigableId || !registerElement) {
      return undefined;
    }

    // We need to find the article element. Since containerRef is passed from parent,
    // we need a different approach. We'll use a callback ref pattern.
    return () => {
      registerElement(navigableId, null);
    };
  }, [navigableId, registerElement]);

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

  // Create a combined ref callback that handles both containerRef and element registration
  const setArticleRef = (element: HTMLElement | null) => {
    // Handle containerRef if it's a callback ref
    if (typeof containerRef === 'function') {
      containerRef(element);
    } else if (containerRef && 'current' in containerRef) {
      (containerRef as React.MutableRefObject<HTMLElement | null>).current = element;
    }

    // Register element for keyboard navigation
    if (navigableId && registerElement) {
      registerElement(navigableId, element);
    }
  };

  // Determine tabIndex: use roving tabindex when navigableId is provided
  const tabIndex = navigableId ? (isFocused ? 0 : -1) : isInteractive ? 0 : -1;

  return (
    <article
      ref={setArticleRef}
      className={`sheet-row ${isActive ? 'sheet-row-active' : ''} ${isContextMenuOpen ? 'sheet-row-context-open' : ''} ${isToggleable ? 'sheet-row-pin-toggleable' : ''} ${worksheet.groupId ? 'sheet-row-grouped' : 'sheet-row-standalone'} ${isDragged ? 'sheet-row-dragging' : ''} ${isOverlay ? 'sheet-row-overlay' : ''}`}
      data-active={isActive ? 'true' : 'false'}
      data-highlighted={isHighlighted ? 'true' : 'false'}
      data-context-open={isContextMenuOpen ? 'true' : 'false'}
      data-pin-visible={(leadingState === 'pin-action' || leadingState === 'unpin-action') ? 'true' : 'false'}
      data-leading-state={leadingState}
      data-interaction-suppressed={isInteractionSuppressed ? 'true' : 'false'}
      data-navigable-id={navigableId}
      data-focused={navigableId ? isFocused : undefined}
      style={containerStyle}
      role={isInteractive ? 'button' : undefined}
      tabIndex={tabIndex}
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

        if (hasNestedInteractiveTarget(event.target, event.currentTarget)) {
          return;
        }

        const managedNavigationKey = event.key === 'ArrowDown'
          || event.key === 'ArrowUp'
          || event.key === 'Enter'
          || event.key === 'Home'
          || event.key === 'End'
          || event.key === 'ArrowLeft'
          || event.key === 'ArrowRight';

        // If we have keyboard navigation context, prioritize it for navigation keys.
        // This prevents dnd-kit sortable listeners from stealing Arrow/Enter events.
        if (navigableId && onItemKeyDown && managedNavigationKey) {
          onItemKeyDown(event, navigableId);
          return;
        }

        onContainerKeyDown?.(event);

        if (event.defaultPrevented) {
          return;
        }

        // If we have keyboard navigation context for non-managed keys, delegate now.
        if (navigableId && onItemKeyDown) {
          onItemKeyDown(event, navigableId);
          if (event.defaultPrevented) {
            return;
          }
        }

        // Fallback to default behavior (Enter/Space to activate)
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

export const SheetRow = memo(SheetRowComponent, areSheetRowPropsEqual);
