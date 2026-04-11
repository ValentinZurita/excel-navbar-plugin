import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  shouldSuppressActivation: (worksheetId: string) => boolean;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onTogglePin?: (worksheetId: string) => void;
  onOpenContextMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: WorksheetEntity }) => void;
}

export function SortableWorksheetRow({
  worksheet,
  containerId,
  index,
  isActive,
  isContextMenuOpen,
  isInsertionBefore,
  shouldSuppressActivation,
  onActivate,
  onTogglePin,
  onOpenContextMenu,
}: SortableWorksheetRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: worksheet.worksheetId,
    data: {
      type: 'worksheet',
      worksheetId: worksheet.worksheetId,
      containerId,
      index,
    },
  });

  return (
    <>
      {isInsertionBefore ? <div className="worksheet-insertion-line" aria-hidden="true" /> : null}

      <SheetRow
        worksheet={worksheet}
        isActive={isActive}
        isContextMenuOpen={isContextMenuOpen}
        isDragged={isDragging}
        containerRef={setNodeRef}
        containerStyle={{
          transform: CSS.Transform.toString(transform),
          transition,
          zIndex: isDragging ? 1 : undefined,
        }}
        containerProps={{
          ...attributes,
          ...listeners,
        }}
        onActivate={(worksheetId) => {
          if (isDragging || shouldSuppressActivation(worksheetId)) {
            return;
          }

          void onActivate(worksheetId);
        }}
        onTogglePin={onTogglePin}
        onOpenContextMenu={onOpenContextMenu}
      />
    </>
  );
}
