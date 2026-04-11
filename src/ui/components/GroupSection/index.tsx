import type { DragEvent } from 'react';
import type { NavigatorGroupView } from '../../../domain/navigation/types';
import { GroupCard } from '../GroupCard';

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
        <GroupCard key={group.groupId} group={group} {...props} />
      ))}
    </div>
  );
}
