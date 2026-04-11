import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import type {
  WorksheetContainerId,
  WorksheetProjectedDropTarget,
} from '../../taskpane/dnd/worksheetDndModel';
import { SheetRow } from '../SheetRow';
import { SortableWorksheetRow } from '../SortableWorksheetRow';
import { WorksheetDropZone } from '../WorksheetDropZone';

interface SheetListDragConfig {
  containerId: WorksheetContainerId;
  activeWorksheet?: WorksheetEntity | null;
  projectedDropTarget: WorksheetProjectedDropTarget | null;
  isDragActive: boolean;
  shouldSuppressActivation: (worksheetId: string) => boolean;
}

interface SheetListProps {
  worksheets: WorksheetEntity[];
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onTogglePin?: (worksheetId: string) => void;
  onOpenContextMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: WorksheetEntity }) => void;
  dragConfig?: SheetListDragConfig;
}

function isGroupContainerId(containerId: WorksheetContainerId): boolean {
  return containerId !== 'sheets';
}

export function SheetList(props: SheetListProps) {
  if (!props.worksheets.length && !props.dragConfig?.isDragActive) {
    return null;
  }

  const dragConfig = props.dragConfig;

  if (
    dragConfig &&
    isGroupContainerId(dragConfig.containerId) &&
    props.worksheets.length === 0
  ) {
    return null;
  }

  const endDropLineActive = Boolean(
    dragConfig &&
      dragConfig.projectedDropTarget?.containerId === dragConfig.containerId &&
      dragConfig.projectedDropTarget.kind === 'container-end' &&
      dragConfig.projectedDropTarget.index === props.worksheets.length,
  );
  const shouldRenderEndDropZone = Boolean(dragConfig);
  const sheetListClassName = dragConfig?.isDragActive ? 'sheet-list sheet-list-drag-active' : 'sheet-list';

  if (!dragConfig) {
    return (
      <div className={sheetListClassName}>
        {props.worksheets.map((worksheet) => (
          <SheetRow
            key={worksheet.worksheetId}
            worksheet={worksheet}
            isActive={worksheet.worksheetId === props.activeWorksheetId}
            isContextMenuOpen={worksheet.worksheetId === props.contextMenuOpenId}
            onActivate={props.onActivate}
            onTogglePin={props.onTogglePin}
            onOpenContextMenu={props.onOpenContextMenu}
          />
        ))}
      </div>
    );
  }

  return (
    <SortableContext items={props.worksheets.map((worksheet) => worksheet.worksheetId)} strategy={verticalListSortingStrategy}>
      <div className={sheetListClassName}>
        {props.worksheets.map((worksheet, index) => (
          <SortableWorksheetRow
            key={worksheet.worksheetId}
            worksheet={worksheet}
            containerId={dragConfig.containerId}
            index={index}
            isActive={worksheet.worksheetId === props.activeWorksheetId}
            isContextMenuOpen={worksheet.worksheetId === props.contextMenuOpenId}
            isInsertionBefore={
              dragConfig.projectedDropTarget?.containerId === dragConfig.containerId &&
              dragConfig.projectedDropTarget.index === index
            }
            shouldSuppressActivation={dragConfig.shouldSuppressActivation}
            onActivate={props.onActivate}
            onTogglePin={props.onTogglePin}
            onOpenContextMenu={props.onOpenContextMenu}
          />
        ))}

        {shouldRenderEndDropZone ? (
          <WorksheetDropZone
            dropTargetId={`${dragConfig.containerId}:end`}
            containerId={dragConfig.containerId}
            index={props.worksheets.length}
            kind="container-end"
            isActive={endDropLineActive}
            isDragActive={dragConfig.isDragActive}
            isEmpty={props.worksheets.length === 0}
            testId={`${dragConfig.containerId}-drop-end`}
          />
        ) : null}
      </div>
    </SortableContext>
  );
}
