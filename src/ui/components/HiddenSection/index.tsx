import type { WorksheetEntity } from '../../../domain/navigation/types';
import { useLeadingClusterInteraction } from '../../hooks/useLeadingClusterInteraction';
import { ChevronDownIcon, ChevronRightIcon, EyeIcon, EyeOffIcon } from '../../icons';
import '../SheetRow/SheetRow.css';
import './HiddenSection.css';
import '../Section/Section.css';

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

interface HiddenSheetRowProps {
  worksheet: WorksheetEntity;
  onUnhide: (worksheetId: string) => void | Promise<void>;
  onOpenContextMenu: (args: {
    target: HTMLElement;
    x: number;
    y: number;
    worksheet: WorksheetEntity;
  }) => void;
}

/**
 * Same leading-slot pattern as SheetRow pin: muted base icon, overlay action on hover/focus with motion.
 */
function HiddenSheetRow({ worksheet, onUnhide, onOpenContextMenu }: HiddenSheetRowProps) {
  const { isHovered, isFocused, clusterPointerProps, actionFocusProps } = useLeadingClusterInteraction();
  const isVeryHidden = worksheet.visibility === 'VeryHidden';
  const showUnhideAction = !isVeryHidden && (isHovered || isFocused);

  return (
    <article
      className="sheet-row hidden-row"
      data-unhide-interacting={showUnhideAction ? 'true' : 'false'}
      title={isVeryHidden ? 'Cannot unhide Very Hidden sheet' : undefined}
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
        <div className="sheet-list section-body">
          {worksheets.map((worksheet) => (
            <HiddenSheetRow
              key={worksheet.worksheetId}
              worksheet={worksheet}
              onUnhide={onUnhide}
              onOpenContextMenu={onOpenContextMenu}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
