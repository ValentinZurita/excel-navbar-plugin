import { useDroppable } from '@dnd-kit/core';
import type { NavigatorGroupView } from '../../../domain/navigation/types';
import type { WorksheetProjectedDropTarget } from '../../taskpane/dnd/worksheetDndModel';
import type { GroupDragVisualConfig } from '../../taskpane/types/worksheetDragVisualConfig';
import { toGroupContainerId } from '../../taskpane/dnd/worksheetDndModel';
import { GroupFolderIcon } from '../../icons';
import { SheetList } from '../SheetList';
import './GroupCard.css';

type GroupDragConfig = GroupDragVisualConfig;

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
  onTogglePin?: (worksheetId: string) => void;
}

function isGroupHeaderDropActive(
  projectedDropTarget: WorksheetProjectedDropTarget | null,
  containerId: ReturnType<typeof toGroupContainerId>,
) {
  return Boolean(
    projectedDropTarget?.containerId === containerId && projectedDropTarget.kind === 'group-header',
  );
}

export function GroupCard({
  group,
  onToggleCollapsed,
  onOpenGroupMenu,
  onOpenSheetMenu,
  ...rest
}: GroupCardProps) {
  const containerId = toGroupContainerId(group.groupId);
  const dragConfig = rest.dragConfig;
  const sheetListDragConfig = dragConfig
    ? {
        containerId,
        projectedDropTarget: dragConfig.projectedDropTarget,
        isDragActive: dragConfig.isDragActive,
        shouldSuppressActivation: dragConfig.shouldSuppressActivation,
      }
    : undefined;

  const { setNodeRef } = useDroppable({
    id: `group-header:${group.groupId}`,
    data: {
      type: 'worksheet-drop-target',
      containerId,
      index: group.worksheets.length,
      kind: 'group-header',
    },
    disabled: !dragConfig?.isDragActive,
  });

  const isDropActive = isGroupHeaderDropActive(dragConfig?.projectedDropTarget ?? null, containerId);
  const isFolderFlashing = dragConfig?.flashedGroupId === group.groupId;

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
          dragConfig={sheetListDragConfig}
          onActivate={rest.onActivate}
          onTogglePin={rest.onTogglePin}
          onOpenContextMenu={onOpenSheetMenu}
        />
      ) : null}
    </section>
  );
}
