import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import type { WorksheetContainerId } from '../../taskpane/dnd/worksheetDndModel';
import { SheetRow } from '../SheetRow';

interface SortableWorksheetRowProps {
  worksheet: WorksheetEntity;
  containerId: WorksheetContainerId;
  index: number;
  isActive: boolean;
  isContextMenuOpen?: boolean;
  isInsertionBefore: boolean;
  isInteractionSuppressed?: boolean;
  isRenaming?: boolean;
  shouldSuppressActivation: (worksheetId: string) => boolean;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onTogglePin?: (worksheetId: string) => void;
  onOpenContextMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: WorksheetEntity }) => void;
  onRenameSubmit?: (worksheetId: string, newName: string) => void | Promise<void>;
  onRenameCancel?: () => void;
  /** Optional: ID for keyboard navigation */
  navigableId?: string;
  /** Whether this row has keyboard focus */
  isFocused?: boolean;
  /** Handler for keyboard navigation */
  onItemKeyDown?: (event: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  /** Register DOM element for focus management */
  registerElement?: (id: string, element: HTMLElement | null) => void;
}

function shouldBlockActivation(isDragging: boolean, shouldSuppressActivation: (worksheetId: string) => boolean, worksheetId: string) {
  return isDragging || shouldSuppressActivation(worksheetId);
}

function areSortableWorksheetRowPropsEqual(
  left: SortableWorksheetRowProps,
  right: SortableWorksheetRowProps,
) {
  return left.worksheet === right.worksheet
    && left.containerId === right.containerId
    && left.index === right.index
    && left.isActive === right.isActive
    && left.isContextMenuOpen === right.isContextMenuOpen
    && left.isInsertionBefore === right.isInsertionBefore
    && left.isInteractionSuppressed === right.isInteractionSuppressed
    && left.isRenaming === right.isRenaming
    && left.shouldSuppressActivation === right.shouldSuppressActivation
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

function SortableWorksheetRowComponent({
  worksheet,
  containerId,
  index,
  isActive,
  isContextMenuOpen,
  isInsertionBefore,
  isInteractionSuppressed,
  isRenaming,
  shouldSuppressActivation,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
  onRenameSubmit,
  onRenameCancel,
  navigableId,
  isFocused,
  onItemKeyDown,
  registerElement,
}: SortableWorksheetRowProps) {
  const isRenameActive = Boolean(isRenaming);
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: worksheet.worksheetId,
    data: {
      type: 'worksheet',
      worksheetId: worksheet.worksheetId,
      containerId,
      index,
    },
    disabled: isRenameActive,
  });

  const handleActivate = (worksheetId: string) => {
    if (shouldBlockActivation(isDragging, shouldSuppressActivation, worksheetId)) {
      return;
    }

    void onActivate(worksheetId);
  };

  return (
    <div className="sortable-worksheet-row">
      {isInsertionBefore ? (
        <div
          className="worksheet-insertion-line worksheet-insertion-line-active row-insertion-line"
          aria-hidden="true"
        />
      ) : null}

      <SheetRow
        worksheet={worksheet}
        isActive={isActive}
        isContextMenuOpen={isContextMenuOpen}
        isDragged={isDragging}
        isInteractionSuppressed={isInteractionSuppressed}
        isRenaming={isRenaming}
        navigableId={navigableId}
        isFocused={isFocused}
        containerRef={setNodeRef}
        containerProps={{
          ...attributes,
          ...(isRenameActive ? {} : listeners),
        }}
        onActivate={handleActivate}
        onTogglePin={onTogglePin}
        onOpenContextMenu={onOpenContextMenu}
        onRenameSubmit={onRenameSubmit}
        onRenameCancel={onRenameCancel}
        onItemKeyDown={onItemKeyDown}
        registerElement={registerElement}
      />
    </div>
  );
}

export const SortableWorksheetRow = memo(
  SortableWorksheetRowComponent,
  areSortableWorksheetRowPropsEqual,
);
