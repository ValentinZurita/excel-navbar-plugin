import type { NavigatorGroupView } from '../../../domain/navigation/types';
import type { GroupDragVisualConfig } from '../../taskpane/types/worksheetDragVisualConfig';
import { GroupCard } from '../GroupCard';

type GroupDragConfig = GroupDragVisualConfig;

interface GroupSectionProps {
  groups: NavigatorGroupView[];
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  groupMenuOpenId?: string;
  dragConfig?: GroupDragConfig;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string) => void;
  onTogglePin?: (worksheetId: string) => void;
  onOpenGroupMenu: (args: { target: HTMLElement; x: number; y: number; groupId: string; groupName: string }) => void;
  onOpenSheetMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: NavigatorGroupView['worksheets'][number] }) => void;
}

export function GroupSection({
  groups,
  activeWorksheetId,
  contextMenuOpenId,
  groupMenuOpenId,
  dragConfig,
  onActivate,
  onToggleCollapsed,
  onTogglePin,
  onOpenGroupMenu,
  onOpenSheetMenu,
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
          onActivate={onActivate}
          onToggleCollapsed={onToggleCollapsed}
          onTogglePin={onTogglePin}
          onOpenGroupMenu={onOpenGroupMenu}
          onOpenSheetMenu={onOpenSheetMenu}
        />
      ))}
    </div>
  );
}
