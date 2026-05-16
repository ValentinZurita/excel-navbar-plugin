import type { GroupColorToken, NavigatorGroupView } from '../../../domain/navigation/types';
import type { GroupDragVisualConfig } from '../../taskpane/types/worksheetDragVisualConfig';
import { GroupCard } from '../GroupCard';
import type { WorksheetPreviewPointerPosition } from '../../../application/navigation/useWorksheetPreview';

type GroupDragConfig = GroupDragVisualConfig;

interface GroupSectionProps {
  groups: NavigatorGroupView[];
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  groupMenuOpenId?: string;
  dragConfig?: GroupDragConfig;
  renamingGroupId?: string | null;
  renamingWorksheetId?: string | null;
  renameInvalidWorksheetId?: string | null;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string) => void;
  onTogglePin?: (worksheetId: string) => void;
  onOpenGroupMenu: (args: {
    target: HTMLElement;
    x: number;
    y: number;
    groupId: string;
    groupName: string;
    colorToken: GroupColorToken;
  }) => void;
  onOpenSheetMenu: (args: {
    target: HTMLElement;
    x: number;
    y: number;
    worksheet: NavigatorGroupView['worksheets'][number];
  }) => void;
  onRenameSubmit?: (groupId: string, newName: string) => void;
  onRenameCancel?: () => void;
  onRenameWorksheetSubmit?: (worksheetId: string, newName: string) => void | Promise<void>;
  onRenameWorksheetValueChange?: (worksheetId: string, value: string) => void;
  onRenameWorksheetMaxLengthReached?: (worksheetId: string) => void;
  onStartRenameWorksheet?: (worksheetId: string) => void;
  /** Logical focus item ID for DOM focus management */
  focusedItemId?: string | null;
  /** Taskpane item with strong visual highlight */
  visualFocusedItemId?: string | null;
  /** Taskpane item fading out after highlight release */
  visualExitingItemId?: string | null;
  /** Handler for group header keyboard navigation */
  onGroupHeaderKeyDown?: (
    event: React.KeyboardEvent<HTMLElement>,
    groupId: string,
    isCollapsed: boolean,
  ) => void;
  /** Handler for worksheet keyboard navigation inside expanded groups */
  onItemKeyDown?: (event: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
  /** Register DOM element for focus management */
  registerElement?: (id: string, element: HTMLElement | null) => void;
  /** Schedule a delayed worksheet preview anchored to a visible row. */
  onPreviewRequest?: (args: {
    worksheet: NavigatorGroupView['worksheets'][number];
    anchorElement: HTMLElement;
    pointerPosition: WorksheetPreviewPointerPosition;
  }) => void;
  /** Cancel any pending or visible worksheet preview. */
  onPreviewCancel?: (worksheetId: string) => void;
}

export function GroupSection({
  groups,
  activeWorksheetId,
  contextMenuOpenId,
  groupMenuOpenId,
  dragConfig,
  renamingGroupId,
  renamingWorksheetId,
  renameInvalidWorksheetId,
  onActivate,
  onToggleCollapsed,
  onTogglePin,
  onOpenGroupMenu,
  onOpenSheetMenu,
  onRenameSubmit,
  onRenameCancel,
  onRenameWorksheetSubmit,
  onRenameWorksheetValueChange,
  onRenameWorksheetMaxLengthReached,
  onStartRenameWorksheet,
  focusedItemId,
  visualFocusedItemId,
  visualExitingItemId,
  onGroupHeaderKeyDown,
  onItemKeyDown,
  registerElement,
  onPreviewRequest,
  onPreviewCancel,
}: GroupSectionProps) {
  const className = dragConfig?.isDragActive ? 'group-list group-list-drag-active' : 'group-list';

  return (
    <div className={className}>
      {groups.map((group) => {
        const navigableId = `group-header:${group.groupId}`;
        const isFocused = focusedItemId === navigableId;
        const isVisualFocused = visualFocusedItemId === navigableId;
        const isVisualExiting = visualExitingItemId === navigableId;
        const isActiveDimmed = Boolean(visualFocusedItemId && visualFocusedItemId !== navigableId);

        return (
          <GroupCard
            key={group.groupId}
            group={group}
            activeWorksheetId={activeWorksheetId}
            contextMenuOpenId={contextMenuOpenId}
            groupMenuOpenId={groupMenuOpenId}
            dragConfig={dragConfig}
            isRenaming={renamingGroupId === group.groupId}
            renamingWorksheetId={renamingWorksheetId}
            renameInvalidWorksheetId={renameInvalidWorksheetId}
            onRenameWorksheetSubmit={onRenameWorksheetSubmit}
            onRenameWorksheetValueChange={onRenameWorksheetValueChange}
            onRenameWorksheetMaxLengthReached={onRenameWorksheetMaxLengthReached}
            onStartRenameWorksheet={onStartRenameWorksheet}
            navigableId={navigableId}
            isFocused={isFocused}
            isVisualFocused={isVisualFocused}
            isVisualExiting={isVisualExiting}
            isActiveDimmed={isActiveDimmed}
            onActivate={onActivate}
            onToggleCollapsed={onToggleCollapsed}
            onTogglePin={onTogglePin}
            onOpenGroupMenu={onOpenGroupMenu}
            onOpenSheetMenu={onOpenSheetMenu}
            onRenameSubmit={onRenameSubmit}
            onRenameCancel={onRenameCancel}
            onGroupHeaderKeyDown={onGroupHeaderKeyDown}
            visualFocusedItemId={visualFocusedItemId}
            visualExitingItemId={visualExitingItemId}
            onItemKeyDown={onItemKeyDown}
            registerElement={registerElement}
            onPreviewRequest={onPreviewRequest}
            onPreviewCancel={onPreviewCancel}
          />
        );
      })}
    </div>
  );
}
