import type { DragEvent } from 'react';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import { SheetRow } from '../SheetRow';
import { WorksheetDropZone } from '../WorksheetDropZone';

interface SheetListDragConfig {
  draggedWorksheetId: string | null;
  activeDropTargetId: string | null;
  dropTargetPrefix: string;
  isDragActive: boolean;
  onStartDrag: (event: DragEvent<HTMLElement>, worksheet: WorksheetEntity) => void;
  onEndDrag: () => void;
  onDragOverDropZone: (event: DragEvent<HTMLElement>, dropTargetId: string) => void;
  onDropAtIndex: (event: DragEvent<HTMLElement>, targetIndex: number) => void;
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

export function SheetList(props: SheetListProps) {
  if (!props.worksheets.length && !props.dragConfig?.isDragActive) {
    return null;
  }

  function resolveTargetIndex(event: DragEvent<HTMLElement>, rowIndex: number) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.height <= 0) {
      return rowIndex;
    }

    const pointerY = Number.isFinite(event.clientY) ? event.clientY : bounds.top;
    const pointerOffset = pointerY - bounds.top;
    return pointerOffset < bounds.height / 2 ? rowIndex : rowIndex + 1;
  }

  return (
    <div className="sheet-list">
      {props.dragConfig ? (
        <WorksheetDropZone
          testId={`${props.dragConfig.dropTargetPrefix}-drop-0`}
          dropTargetId={`${props.dragConfig.dropTargetPrefix}:0`}
          isDragActive={props.dragConfig.isDragActive}
          isActive={props.dragConfig.activeDropTargetId === `${props.dragConfig.dropTargetPrefix}:0`}
          onDragOver={props.dragConfig.onDragOverDropZone}
          onDrop={(event) => props.dragConfig?.onDropAtIndex(event, 0)}
        />
      ) : null}

      {props.worksheets.map((worksheet, index) => (
        <div key={worksheet.worksheetId}>
          <SheetRow
            worksheet={worksheet}
            isActive={worksheet.worksheetId === props.activeWorksheetId}
            isContextMenuOpen={worksheet.worksheetId === props.contextMenuOpenId}
            isDragged={props.dragConfig?.draggedWorksheetId === worksheet.worksheetId}
            draggable={props.dragConfig?.isDragActive !== undefined ? worksheet.visibility === 'Visible' && !worksheet.isPinned : undefined}
            onActivate={props.onActivate}
            onTogglePin={props.onTogglePin}
            onDragStart={props.dragConfig?.onStartDrag}
            onDragEnd={props.dragConfig?.onEndDrag}
            onDragOver={props.dragConfig ? (event) => {
              const targetIndex = resolveTargetIndex(event, index);
              props.dragConfig?.onDragOverDropZone(event, `${props.dragConfig.dropTargetPrefix}:${targetIndex}`);
            } : undefined}
            onDrop={props.dragConfig ? (event) => {
              const targetIndex = resolveTargetIndex(event, index);
              props.dragConfig?.onDropAtIndex(event, targetIndex);
            } : undefined}
            onOpenContextMenu={props.onOpenContextMenu}
          />

          {props.dragConfig ? (
            <WorksheetDropZone
              testId={`${props.dragConfig.dropTargetPrefix}-drop-${index + 1}`}
              dropTargetId={`${props.dragConfig.dropTargetPrefix}:${index + 1}`}
              isDragActive={props.dragConfig.isDragActive}
              isActive={props.dragConfig.activeDropTargetId === `${props.dragConfig.dropTargetPrefix}:${index + 1}`}
              onDragOver={props.dragConfig.onDragOverDropZone}
              onDrop={(event) => props.dragConfig?.onDropAtIndex(event, index + 1)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
