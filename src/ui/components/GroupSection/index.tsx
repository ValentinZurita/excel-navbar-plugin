import type { GroupColorToken, NavigatorGroupView } from '../../../domain/navigation/types';
import type { GroupDragVisualConfig } from '../../taskpane/types/worksheetDragVisualConfig';
import { GroupCard } from '../GroupCard';

type GroupDragConfig = GroupDragVisualConfig;

interface GroupSectionProps {
  groups: NavigatorGroupView[];
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  groupMenuOpenId?: string;
  dragConfig?: GroupDragConfig;
  renamingGroupId?: string | null;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string) => void;
  onTogglePin?: (worksheetId: string) => void;
  onOpenGroupMenu: (args: { target: HTMLElement; x: number; y: number; groupId: string; groupName: string; colorToken: GroupColorToken }) => void;
  onOpenSheetMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: NavigatorGroupView['worksheets'][number] }) => void;
  onRenameSubmit?: (groupId: string, newName: string) => void;
  onRenameCancel?: () => void;
}

export function GroupSection({
  groups,
  activeWorksheetId,
  contextMenuOpenId,
  groupMenuOpenId,
  dragConfig,
  renamingGroupId,
  onActivate,
  onToggleCollapsed,
  onTogglePin,
  onOpenGroupMenu,
  onOpenSheetMenu,
  onRenameSubmit,
  onRenameCancel,
}: GroupSectionProps) {
  const className = dragConfig?.isDragActive ? 'group-list group-list-drag-active' : 'group-list';

  return (
    <div className={className}>
      {groups.map((group) => (
        <GroupCard
          key={group.groupId}
          group={group}
          activeWorksheetId={activeWorksheetId}
          contextMenuOpenId={contextMenuOpenId}
          groupMenuOpenId={groupMenuOpenId}
          dragConfig={dragConfig}
          isRenaming={renamingGroupId === group.groupId}
          onActivate={onActivate}
          onToggleCollapsed={onToggleCollapsed}
          onTogglePin={onTogglePin}
          onOpenGroupMenu={onOpenGroupMenu}
          onOpenSheetMenu={onOpenSheetMenu}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </div>
  );
}
