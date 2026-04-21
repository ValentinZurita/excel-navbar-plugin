import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { WorksheetEntity } from '../../../domain/navigation/types';
import type { WorksheetContainerId, WorksheetProjectedDropTarget } from '../../taskpane/dnd/worksheetDndModel';
import type { WorksheetDragVisualConfig } from '../../taskpane/types/worksheetDragVisualConfig';
import { SheetRow } from '../SheetRow';
import { SortableWorksheetRow } from '../SortableWorksheetRow';
import { WorksheetDropZone } from '../WorksheetDropZone';

interface SheetListDragConfig extends WorksheetDragVisualConfig {
  containerId: WorksheetContainerId;
}

interface SheetListProps {
  worksheets: WorksheetEntity[];
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  renamingWorksheetId?: string | null;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onTogglePin?: (worksheetId: string) => void;
  onOpenContextMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: WorksheetEntity }) => void;
  dragConfig?: SheetListDragConfig;
  onRenameSubmit?: (worksheetId: string, newName: string) => void | Promise<void>;
  onRenameCancel?: () => void;
  onStartRenameWorksheet?: (worksheetId: string) => void;
  /** Logical focus item ID for DOM focus management */
  focusedItemId?: string | null;
  /** Taskpane item with strong visual highlight */
  visualFocusedItemId?: string | null;
  /** Taskpane item fading out after highlight release */
  visualExitingItemId?: string | null;
  /** Handler for keyboard navigation on worksheet items */
  onItemKeyDown?: (event: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  /** Register DOM element for focus management */
  registerElement?: (id: string, element: HTMLElement | null) => void;
}

function isGroupContainerId(containerId: WorksheetContainerId): boolean {
  return containerId !== 'sheets' && containerId !== 'pinned';
}

function shouldHideEmptyList(worksheets: WorksheetEntity[], dragConfig?: SheetListDragConfig) {
  if (!dragConfig) {
    return worksheets.length === 0;
  }

  // Pinned section should not be hidden even when empty during drag
  if (dragConfig.containerId === 'pinned') {
    return false;
  }

  return isGroupContainerId(dragConfig.containerId) && worksheets.length === 0;
}

function isProjectedTargetInContainer(
  projectedDropTarget: WorksheetProjectedDropTarget | null,
  containerId: WorksheetContainerId,
) {
  return projectedDropTarget?.containerId === containerId;
}

function isGapDropActive(
  projectedDropTarget: WorksheetProjectedDropTarget | null,
  containerId: WorksheetContainerId,
  gapIndex: number,
) {
  return Boolean(
    isProjectedTargetInContainer(projectedDropTarget, containerId) &&
      projectedDropTarget?.kind === 'gap' &&
      projectedDropTarget.index === gapIndex,
  );
}

function isEndDropLineActive(
  projectedDropTarget: WorksheetProjectedDropTarget | null,
  containerId: WorksheetContainerId,
  worksheetCount: number,
) {
  return Boolean(
    isProjectedTargetInContainer(projectedDropTarget, containerId) &&
      projectedDropTarget?.kind === 'container-end' &&
      projectedDropTarget.index === worksheetCount,
  );
}

export function SheetList(props: SheetListProps) {
  const dragConfig = props.dragConfig;
  const shouldRenderStaticList = !dragConfig;
  const { focusedItemId, visualFocusedItemId, visualExitingItemId, onItemKeyDown, registerElement } = props;

  if (shouldHideEmptyList(props.worksheets, dragConfig)) {
    return null;
  }

  const sheetListClassName = dragConfig?.isDragActive ? 'sheet-list sheet-list-drag-active' : 'sheet-list';

  if (shouldRenderStaticList) {
    return (
      <div className={sheetListClassName}>
        {props.worksheets.map((worksheet) => {
          const navigableId = `worksheet:${worksheet.worksheetId}`;
          const isFocused = focusedItemId === navigableId;
          const isVisualFocused = visualFocusedItemId === navigableId;
          const isVisualExiting = visualExitingItemId === navigableId;
          const isActiveDimmed = Boolean(visualFocusedItemId && visualFocusedItemId !== navigableId);

          return (
            <SheetRow
              key={worksheet.worksheetId}
              worksheet={worksheet}
              isActive={worksheet.worksheetId === props.activeWorksheetId}
              isContextMenuOpen={worksheet.worksheetId === props.contextMenuOpenId}
              isInteractionSuppressed={false}
              isRenaming={props.renamingWorksheetId === worksheet.worksheetId}
              navigableId={navigableId}
              isFocused={isFocused}
              isVisualFocused={isVisualFocused}
              isVisualExiting={isVisualExiting}
              isActiveDimmed={isActiveDimmed}
              onActivate={props.onActivate}
              onTogglePin={props.onTogglePin}
              onOpenContextMenu={props.onOpenContextMenu}
              onRenameSubmit={props.onRenameSubmit}
              onRenameCancel={props.onRenameCancel}
              onStartRename={props.onStartRenameWorksheet}
              onItemKeyDown={onItemKeyDown}
              registerElement={registerElement}
            />
          );
        })}
      </div>
    );
  }

  const endDropLineActive = isEndDropLineActive(
    dragConfig.projectedDropTarget,
    dragConfig.containerId,
    props.worksheets.length,
  );

  return (
    <SortableContext items={props.worksheets.map((worksheet) => worksheet.worksheetId)} strategy={verticalListSortingStrategy}>
      <div className={sheetListClassName}>
        {props.worksheets.map((worksheet, index) => {
          const navigableId = `worksheet:${worksheet.worksheetId}`;
          const isFocused = focusedItemId === navigableId;
          const isVisualFocused = visualFocusedItemId === navigableId;
          const isVisualExiting = visualExitingItemId === navigableId;
          const isActiveDimmed = Boolean(visualFocusedItemId && visualFocusedItemId !== navigableId);
          const gapActive = isGapDropActive(dragConfig.projectedDropTarget, dragConfig.containerId, index);

          return (
            <div key={worksheet.worksheetId} className="sortable-worksheet-slot">
              <WorksheetDropZone
                dropTargetId={`${dragConfig.containerId}:gap:${index}`}
                containerId={dragConfig.containerId}
                index={index}
                kind="gap"
                isActive={gapActive}
                isDragActive={dragConfig.isDragActive}
                testId={`${dragConfig.containerId}-drop-gap-${index}`}
              />

              <SortableWorksheetRow
                worksheet={worksheet}
                containerId={dragConfig.containerId}
                index={index}
                isActive={worksheet.worksheetId === props.activeWorksheetId}
                isContextMenuOpen={worksheet.worksheetId === props.contextMenuOpenId}
                isInteractionSuppressed={dragConfig.isDragActive}
                shouldSuppressActivation={dragConfig.shouldSuppressActivation}
                isRenaming={props.renamingWorksheetId === worksheet.worksheetId}
                navigableId={navigableId}
                isFocused={isFocused}
                isVisualFocused={isVisualFocused}
                isVisualExiting={isVisualExiting}
                isActiveDimmed={isActiveDimmed}
                onActivate={props.onActivate}
                onTogglePin={props.onTogglePin}
                onOpenContextMenu={props.onOpenContextMenu}
                onRenameSubmit={props.onRenameSubmit}
                onRenameCancel={props.onRenameCancel}
                onStartRenameWorksheet={props.onStartRenameWorksheet}
                onItemKeyDown={onItemKeyDown}
                registerElement={registerElement}
              />
            </div>
          );
        })}

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
      </div>
    </SortableContext>
  );
}
