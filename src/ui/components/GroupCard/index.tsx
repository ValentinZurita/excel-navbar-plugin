import { useDroppable } from '@dnd-kit/core';
import type { NavigatorGroupView, WorksheetEntity } from '../../../domain/navigation/types';
import type { WorksheetProjectedDropTarget } from '../../taskpane/dnd/worksheetDndModel';
import { toGroupContainerId } from '../../taskpane/dnd/worksheetDndModel';
import { GroupFolderIcon } from '../../icons';
import { SheetList } from '../SheetList';
import './GroupCard.css';

interface GroupDragConfig {
  activeWorksheet?: WorksheetEntity | null;
  projectedDropTarget: WorksheetProjectedDropTarget | null;
  flashedGroupId: string | null;
  isDragActive: boolean;
  shouldSuppressActivation: (worksheetId: string) => boolean;
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

export function GroupCard({
  group,
  onToggleCollapsed,
  onOpenGroupMenu,
  onOpenSheetMenu,
  ...rest
}: GroupCardProps) {
  const containerId = toGroupContainerId(group.groupId);
  const { setNodeRef } = useDroppable({
    id: `group-header:${group.groupId}`,
    data: {
      type: 'worksheet-drop-target',
      containerId,
      index: group.worksheets.length,
      kind: 'group-header',
    },
    disabled: !rest.dragConfig?.isDragActive,
  });

  const isDropActive = Boolean(
    rest.dragConfig &&
      rest.dragConfig.projectedDropTarget?.containerId === containerId &&
      rest.dragConfig.projectedDropTarget.kind === 'group-header',
  );
  const isFolderFlashing = rest.dragConfig?.flashedGroupId === group.groupId;

  return (
    <section
      className="group-card"
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
        ref={setNodeRef}
        className={`group-header ${group.groupId === rest.groupMenuOpenId ? 'group-header-context-open' : ''} ${isDropActive ? 'group-header-drop-active' : ''}`}
      >
        <button className="group-toggle" type="button" onClick={() => onToggleCollapsed(group.groupId)}>
          <span className={`group-leading ${isFolderFlashing ? 'group-leading-flash' : ''}`} aria-hidden="true">
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
            containerId,
            projectedDropTarget: rest.dragConfig.projectedDropTarget,
            isDragActive: rest.dragConfig.isDragActive,
            shouldSuppressActivation: rest.dragConfig.shouldSuppressActivation,
          } : undefined}
          onActivate={rest.onActivate}
          onOpenContextMenu={onOpenSheetMenu}
        />
      ) : null}
    </section>
  );
}
