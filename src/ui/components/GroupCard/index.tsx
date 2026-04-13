import { useDroppable } from '@dnd-kit/core';
import type { GroupColorToken, NavigatorGroupView } from '../../../domain/navigation/types';
import type { WorksheetProjectedDropTarget } from '../../taskpane/dnd/worksheetDndModel';
import type { GroupDragVisualConfig } from '../../taskpane/types/worksheetDragVisualConfig';
import { toGroupContainerId } from '../../taskpane/dnd/worksheetDndModel';
import { GroupFolderIcon } from '../../icons';
import { SheetList } from '../SheetList';
import { InlineRenameInput } from '../InlineRenameInput';
import './GroupCard.css';

type GroupDragConfig = GroupDragVisualConfig;

interface GroupCardProps {
  group: NavigatorGroupView;
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  groupMenuOpenId?: string;
  hoveredWorksheetId?: string | null;
  dragConfig?: GroupDragConfig;
  isRenaming?: boolean;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onHoverWorksheet?: (worksheetId: string | null) => void;
  onToggleCollapsed: (groupId: string) => void;
  onOpenGroupMenu: (args: { target: HTMLElement; x: number; y: number; groupId: string; groupName: string; colorToken: GroupColorToken }) => void;
  onOpenSheetMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: NavigatorGroupView['worksheets'][number] }) => void;
  onTogglePin?: (worksheetId: string) => void;
  onRenameSubmit?: (groupId: string, newName: string) => void;
  onRenameCancel?: () => void;
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
  isRenaming,
  onRenameSubmit,
  onRenameCancel,
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
          colorToken: group.colorToken,
        });
      }}
    >
      <header
        ref={setNodeRef}
        className={`group-header ${group.groupId === rest.groupMenuOpenId ? 'group-header-context-open' : ''} ${isDropActive ? 'group-header-drop-active' : ''}`}
      >
        <button className="group-toggle" type="button" onClick={() => onToggleCollapsed(group.groupId)}>
          <span className={`group-leading group-leading-${group.colorToken} ${isFolderFlashing ? 'group-leading-flash' : ''}`} aria-hidden="true">
            <GroupFolderIcon className="group-folder-icon" />
          </span>
          <span className="group-copy">
            {isRenaming && onRenameSubmit ? (
              <InlineRenameInput
                initialValue={group.name}
                onSubmit={(newName) => onRenameSubmit(group.groupId, newName)}
                onCancel={onRenameCancel ?? (() => {})}
              />
            ) : (
              <span className="group-title">{group.name}</span>
            )}
          </span>
        </button>
      </header>

      {!group.isCollapsed ? (
        <SheetList
          worksheets={group.worksheets}
          activeWorksheetId={rest.activeWorksheetId}
          contextMenuOpenId={rest.contextMenuOpenId}
          hoveredWorksheetId={rest.hoveredWorksheetId}
          dragConfig={sheetListDragConfig}
          onActivate={rest.onActivate}
          onHoverWorksheet={rest.onHoverWorksheet}
          onTogglePin={rest.onTogglePin}
          onOpenContextMenu={onOpenSheetMenu}
        />
      ) : null}
    </section>
  );
}
