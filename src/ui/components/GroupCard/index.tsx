import type { DragEvent } from 'react';
import type { NavigatorGroupView } from '../../../domain/navigation/types';
import { GroupFolderIcon } from '../../icons';
import { SheetList } from '../SheetList';
import './GroupCard.css';

interface GroupDragConfig {
  draggedWorksheetId: string | null;
  activeDropTargetId: string | null;
  isDragActive: boolean;
  onStartDrag: (event: DragEvent<HTMLElement>, worksheet: NavigatorGroupView['worksheets'][number]) => void;
  onEndDrag: () => void;
  onDragOverDropZone: (event: DragEvent<HTMLElement>, dropTargetId: string) => void;
  onDropAtIndex: (event: DragEvent<HTMLElement>, groupId: string, targetIndex: number) => void;
  onDropOnHeader: (event: DragEvent<HTMLElement>, groupId: string, worksheetCount: number) => void;
}

interface GroupCardProps {
  group: NavigatorGroupView;
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  groupMenuOpenId?: string;
  dragConfig?: GroupDragConfig;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string) => void;
  onOpenGroupMenu: (args: { target: HTMLElement; x: number; y: number; groupId: string; groupName: string }) => void;
  onOpenSheetMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: NavigatorGroupView['worksheets'][number] }) => void;
}

export function GroupCard({ group, onToggleCollapsed, onOpenGroupMenu, onOpenSheetMenu, ...rest }: GroupCardProps) {
  return (
    <section
      className="group-card"
      // Group menu opens from the card container to include header and child rows.
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenGroupMenu({
          target: event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          groupId: group.groupId,
          groupName: group.name,
        });
      }}
    >
      <header
        className={`group-header ${group.groupId === rest.groupMenuOpenId ? 'group-header-context-open' : ''} ${rest.dragConfig?.activeDropTargetId === `group-header:${group.groupId}` ? 'group-header-drop-active' : ''}`}
        onDragOver={(event) => rest.dragConfig?.onDragOverDropZone(event, `group-header:${group.groupId}`)}
        onDrop={(event) => rest.dragConfig?.onDropOnHeader(event, group.groupId, group.worksheets.length)}
      >
        <button className="group-toggle" type="button" onClick={() => onToggleCollapsed(group.groupId)}>
          <span className="group-leading" aria-hidden="true">
            <GroupFolderIcon className="group-folder-icon" />
          </span>
          <span className="group-copy">
            <span className="group-title">{group.name}</span>
          </span>
        </button>
      </header>

      {!group.isCollapsed ? (
        <SheetList
          worksheets={group.worksheets}
          activeWorksheetId={rest.activeWorksheetId}
          contextMenuOpenId={rest.contextMenuOpenId}
          dragConfig={rest.dragConfig ? {
            draggedWorksheetId: rest.dragConfig.draggedWorksheetId,
            activeDropTargetId: rest.dragConfig.activeDropTargetId,
            dropTargetPrefix: `group:${group.groupId}`,
            isDragActive: rest.dragConfig.isDragActive,
            onStartDrag: rest.dragConfig.onStartDrag,
            onEndDrag: rest.dragConfig.onEndDrag,
            onDragOverDropZone: rest.dragConfig.onDragOverDropZone,
            onDropAtIndex: (event, targetIndex) => rest.dragConfig?.onDropAtIndex(event, group.groupId, targetIndex),
          } : undefined}
          onActivate={rest.onActivate}
          onOpenContextMenu={onOpenSheetMenu}
        />
      ) : null}
    </section>
  );
}
