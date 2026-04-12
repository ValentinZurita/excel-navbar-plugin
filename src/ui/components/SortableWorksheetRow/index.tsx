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
  isHovered?: boolean;
  isInteractionSuppressed?: boolean;
  isRenaming?: boolean;
  shouldSuppressActivation: (worksheetId: string) => boolean;
  onHoverChange?: (worksheetId: string | null) => void;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onTogglePin?: (worksheetId: string) => void;
  onOpenContextMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: WorksheetEntity }) => void;
  onRenameSubmit?: (worksheetId: string, newName: string) => void | Promise<void>;
  onRenameCancel?: () => void;
}

function shouldBlockActivation(isDragging: boolean, shouldSuppressActivation: (worksheetId: string) => boolean, worksheetId: string) {
  return isDragging || shouldSuppressActivation(worksheetId);
}

export function SortableWorksheetRow({
  worksheet,
  containerId,
  index,
  isActive,
  isContextMenuOpen,
  isInsertionBefore,
  isHovered,
  isInteractionSuppressed,
  isRenaming,
  shouldSuppressActivation,
  onHoverChange,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
  onRenameSubmit,
  onRenameCancel,
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
        isHovered={isHovered}
        isInteractionSuppressed={isInteractionSuppressed}
        isRenaming={isRenaming}
        containerRef={setNodeRef}
        containerProps={{
          ...attributes,
          ...(isRenameActive ? {} : listeners),
        }}
        onHoverChange={onHoverChange}
        onActivate={handleActivate}
        onTogglePin={onTogglePin}
        onOpenContextMenu={onOpenContextMenu}
        onRenameSubmit={onRenameSubmit}
        onRenameCancel={onRenameCancel}
      />
    </div>
  );
}
