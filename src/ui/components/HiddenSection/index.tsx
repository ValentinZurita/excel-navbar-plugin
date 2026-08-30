import { useCallback, useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import { useLeadingClusterInteraction } from '../../hooks/useLeadingClusterInteraction';
import { EyeIcon, EyeOffIcon } from '../../icons';
import { SectionHeader } from '../Section';
import '../SheetRow/SheetRow.css';
import './HiddenSection.css';
import '../Section/Section.css';

function hasNestedInteractiveTarget(target: EventTarget | null, currentTarget: HTMLElement) {
  if (!(target instanceof HTMLElement) || target === currentTarget) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const interactiveTarget = target.closest(
    'input, textarea, select, button, a, [contenteditable="true"], [role="textbox"]',
  );
  return Boolean(interactiveTarget && currentTarget.contains(interactiveTarget));
}

interface HiddenSectionProps {
  isCollapsed: boolean;
  worksheets: WorksheetEntity[];
  contextMenuOpenSheetId?: string | null;
  focusedItemId?: string | null;
  visualFocusedItemId?: string | null;
  visualExitingItemId?: string | null;
  navigableId?: string;
  isHeaderFocused?: boolean;
  isHeaderVisualFocused?: boolean;
  isHeaderVisualExiting?: boolean;
  onToggle: () => void;
  onUnhide: (worksheetId: string) => void | Promise<void>;
  onOpenContextMenu: (args: {
    target: HTMLElement;
    x: number;
    y: number;
    worksheet: WorksheetEntity;
  }) => void;
  onHeaderKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onItemKeyDown?: (event: ReactKeyboardEvent<HTMLElement>, itemId: string) => void;
  registerElement?: (id: string, element: HTMLElement | null) => void;
}

interface HiddenSheetRowProps {
  worksheet: WorksheetEntity;
  isContextMenuOpen?: boolean;
  isFocused?: boolean;
  isVisualFocused?: boolean;
  isVisualExiting?: boolean;
  isActiveDimmed?: boolean;
  onUnhide: (worksheetId: string) => void | Promise<void>;
  onOpenContextMenu: (args: {
    target: HTMLElement;
    x: number;
    y: number;
    worksheet: WorksheetEntity;
  }) => void;
  onItemKeyDown?: (event: ReactKeyboardEvent<HTMLElement>, itemId: string) => void;
  registerElement?: (id: string, element: HTMLElement | null) => void;
}

/**
 * Same leading-slot pattern as SheetRow pin: muted base icon, overlay action on hover/focus with motion.
 * Hidden rows now participate in same roving-focus contract as normal worksheet rows.
 */
function HiddenSheetRow({
  worksheet,
  isContextMenuOpen = false,
  isFocused = false,
  isVisualFocused = false,
  isVisualExiting = false,
  isActiveDimmed = false,
  onUnhide,
  onOpenContextMenu,
  onItemKeyDown,
  registerElement,
}: HiddenSheetRowProps) {
  const {
    isHovered,
    isFocused: isLeadingFocused,
    clusterPointerProps,
    actionFocusProps,
  } = useLeadingClusterInteraction();
  const isVeryHidden = worksheet.visibility === 'VeryHidden';
  const showUnhideAction = !isVeryHidden && (isHovered || isLeadingFocused);
  const navigableId = `worksheet:${worksheet.worksheetId}`;
  const isHighlighted = Boolean(isContextMenuOpen);
  const tabIndex = isContextMenuOpen ? -1 : isFocused ? 0 : -1;

  useEffect(() => {
    if (!registerElement) {
      return undefined;
    }
    return () => {
      registerElement(navigableId, null);
    };
  }, [navigableId, registerElement]);

  const setArticleRef = useCallback(
    (element: HTMLElement | null) => {
      if (registerElement) {
        registerElement(navigableId, element);
      }
    },
    [navigableId, registerElement],
  );

  return (
    <article
      ref={setArticleRef}
      className={`sheet-row hidden-row ${isContextMenuOpen ? 'sheet-row-context-open' : ''}`}
      data-unhide-interacting={showUnhideAction ? 'true' : 'false'}
      data-active="false"
      data-highlighted={isHighlighted ? 'true' : 'false'}
      data-context-open={isContextMenuOpen ? 'true' : 'false'}
      data-pin-visible="false"
      data-leading-state="indicator"
      data-interaction-suppressed="false"
      data-navigable-id={navigableId}
      data-focused={isFocused ? 'true' : undefined}
      data-visual-focused={isVisualFocused ? 'true' : undefined}
      data-visual-exiting={isVisualExiting ? 'true' : undefined}
      data-active-dimmed={isActiveDimmed ? 'true' : 'false'}
      role="button"
      tabIndex={tabIndex}
      aria-label={worksheet.name}
      aria-haspopup="menu"
      title={isVeryHidden ? 'Cannot unhide Very Hidden sheet' : undefined}
      onKeyDown={(event) => {
        if (hasNestedInteractiveTarget(event.target, event.currentTarget)) {
          return;
        }

        // Suppress Space on hidden rows so it does not leak to the global
        // DnD KeyboardSensor and initiate a drag on a non-sortable section.
        // Hidden sheets are not draggable; their only action is unhide,
        // which is already reachable via Enter or pointer on the overlay button.
        // stopImmediatePropagation on the native event is required because
        // React's synthetic stopPropagation does not prevent native listeners
        // on document (e.g. dnd-kit's sensor after drag has started) from
        // receiving the event.
        if (event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          event.nativeEvent.stopImmediatePropagation();
          return;
        }

        if (onItemKeyDown) {
          onItemKeyDown(event, navigableId);
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenContextMenu({
          target: event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          worksheet,
        });
      }}
    >
      <span className="sheet-row-nav-highlight" aria-hidden="true" />
      <div className="row-topline">
        <span className="sheet-row-leading" {...clusterPointerProps}>
          <span
            className={`sheet-row-base-indicator ${
              !showUnhideAction ? 'sheet-row-base-indicator-visible' : ''
            }`}
            aria-hidden="true"
          >
            <EyeOffIcon className="sheet-pin-icon" />
          </span>
          {!isVeryHidden ? (
            <button
              className={`sheet-pin-button ${showUnhideAction ? 'sheet-pin-button-visible' : ''}`}
              type="button"
              aria-label={`Unhide ${worksheet.name}`}
              title={`Unhide ${worksheet.name}`}
              onClick={(event) => {
                event.stopPropagation();
                void onUnhide(worksheet.worksheetId);
              }}
              {...actionFocusProps}
            >
              <EyeIcon className="sheet-pin-icon" />
            </button>
          ) : null}
        </span>
        <div className="hidden-sheet-content">
          <span className="sheet-title" style={{ opacity: isVeryHidden ? 0.6 : 1 }}>
            {worksheet.name}
          </span>
          {isVeryHidden ? <small>Very Hidden</small> : null}
        </div>
      </div>
    </article>
  );
}

export function HiddenSection({
  isCollapsed,
  worksheets,
  contextMenuOpenSheetId,
  focusedItemId,
  visualFocusedItemId,
  visualExitingItemId,
  navigableId,
  isHeaderFocused = false,
  isHeaderVisualFocused = false,
  isHeaderVisualExiting = false,
  onToggle,
  onUnhide,
  onOpenContextMenu,
  onHeaderKeyDown,
  onItemKeyDown,
  registerElement,
}: HiddenSectionProps) {
  return (
    <section className="section-card hidden-section">
      <SectionHeader
        title="Hidden"
        isCollapsed={isCollapsed}
        onToggle={onToggle}
        navigableId={navigableId}
        isFocused={isHeaderFocused}
        isVisualFocused={isHeaderVisualFocused}
        isVisualExiting={isHeaderVisualExiting}
        onHeaderKeyDown={onHeaderKeyDown}
        registerElement={registerElement}
      />

      {!isCollapsed ? (
        <div className="sheet-list section-body">
          {worksheets.map((worksheet) => {
            const navigableId = `worksheet:${worksheet.worksheetId}`;
            const isContextMenuOpen = worksheet.worksheetId === contextMenuOpenSheetId;
            const isFocused = focusedItemId === navigableId;
            const isVisualFocused = visualFocusedItemId === navigableId;
            const isVisualExiting = visualExitingItemId === navigableId;
            const isActiveDimmed = false;

            return (
              <HiddenSheetRow
                key={worksheet.worksheetId}
                worksheet={worksheet}
                isContextMenuOpen={isContextMenuOpen}
                isFocused={isFocused}
                isVisualFocused={isVisualFocused}
                isVisualExiting={isVisualExiting}
                isActiveDimmed={isActiveDimmed}
                onUnhide={onUnhide}
                onOpenContextMenu={onOpenContextMenu}
                onItemKeyDown={onItemKeyDown}
                registerElement={registerElement}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
