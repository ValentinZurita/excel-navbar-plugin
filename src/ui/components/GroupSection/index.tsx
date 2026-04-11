import type { NavigatorGroupView, WorksheetEntity } from '../../../domain/navigation/types';
import type { WorksheetProjectedDropTarget } from '../../taskpane/dnd/worksheetDndModel';
import { GroupCard } from '../GroupCard';

interface GroupDragConfig {
  activeWorksheet?: WorksheetEntity | null;
  projectedDropTarget: WorksheetProjectedDropTarget | null;
  flashedGroupId: string | null;
  isDragActive: boolean;
  shouldSuppressActivation: (worksheetId: string) => boolean;
}

interface GroupSectionProps {
  groups: NavigatorGroupView[];
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  groupMenuOpenId?: string;
  dragConfig?: GroupDragConfig;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string) => void;
  onOpenGroupMenu: (args: { target: HTMLElement; x: number; y: number; groupId: string; groupName: string }) => void;
  onOpenSheetMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: NavigatorGroupView['worksheets'][number] }) => void;
}

export function GroupSection(props: GroupSectionProps) {
  return (
    <div className="group-list">
      {props.groups.map((group) => (
        <GroupCard
          key={group.groupId}
          group={group}
          {...props}
        />
      ))}
    </div>
  );
}
