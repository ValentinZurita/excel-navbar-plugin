import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { GroupColorToken, NavigatorGroupView } from '../../../domain/navigation/types';
import type { WorksheetProjectedDropTarget } from '../../taskpane/dnd/worksheetDndModel';
import type { GroupDragVisualConfig } from '../../taskpane/types/worksheetDragVisualConfig';
import { toGroupContainerId } from '../../taskpane/dnd/worksheetDndModel';
import { inferContextMenuInteraction } from '../../taskpane/utils/contextMenuInteraction';
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
  dragConfig?: GroupDragConfig;
  isRenaming?: boolean;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string) => void;
  onOpenGroupMenu: (args: {
    target: HTMLElement;
    x: number;
    y: number;
    groupId: string;
    groupName: string;
    colorToken: GroupColorToken;
    interaction?: 'pointer' | 'keyboard';
  }) => void;
  onOpenSheetMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: NavigatorGroupView['worksheets'][number] }) => void;
  onTogglePin?: (worksheetId: string) => void;
  onRenameSubmit?: (groupId: string, newName: string) => void;
  onRenameCancel?: () => void;
  /** Inline worksheet rename inside this group's list */
  renamingWorksheetId?: string | null;
  onRenameWorksheetSubmit?: (worksheetId: string, newName: string) => void | Promise<void>;
  onStartRenameWorksheet?: (worksheetId: string) => void;
  /** Optional: ID for keyboard navigation on the group header */
  navigableId?: string;
  /** Whether this group header has logical keyboard/pointer focus */
  isFocused?: boolean;
  /** Whether this group header owns visual highlight */
  isVisualFocused?: boolean;
  /** Whether this group header is fading highlight out */
  isVisualExiting?: boolean;
  /** Whether active ghost should dim while another item owns highlight */
  isActiveDimmed?: boolean;
  /** Handler for group header keyboard navigation (ArrowRight/Left, Enter) */
  onGroupHeaderKeyDown?: (event: React.KeyboardEvent<HTMLElement>, groupId: string, isCollapsed: boolean) => void;
  /** Register DOM element for focus management */
  registerElement?: (id: string, element: HTMLElement | null) => void;
  /** Taskpane item with strong visual highlight */
  visualFocusedItemId?: string | null;
  /** Taskpane item fading out after highlight release */
  visualExitingItemId?: string | null;
  /** Handler for keyboard navigation on child worksheets */
  onItemKeyDown?: (event: React.KeyboardEvent<HTMLElement>, itemId: string) => void;
}

function isGroupHeaderDropActive(
  projectedDropTarget: WorksheetProjectedDropTarget | null,
  containerId: ReturnType<typeof toGroupContainerId>,
) {
  return Boolean(
    projectedDropTarget?.containerId === containerId && projectedDropTarget.kind === 'group-header',
  );
}

function areWorksheetListsEqual(
  left: NavigatorGroupView['worksheets'],
  right: NavigatorGroupView['worksheets'],
) {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((worksheet, index) => worksheet === right[index]);
}

function areGroupViewsEqual(left: NavigatorGroupView, right: NavigatorGroupView) {
  return left.groupId === right.groupId
    && left.name === right.name
    && left.colorToken === right.colorToken
    && left.isCollapsed === right.isCollapsed
    && areWorksheetListsEqual(left.worksheets, right.worksheets);
}

function areProjectedDropTargetsEqual(
  left: WorksheetProjectedDropTarget | null | undefined,
  right: WorksheetProjectedDropTarget | null | undefined,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.containerId === right.containerId
    && left.index === right.index
    && left.kind === right.kind;
}

function areGroupDragConfigsEqual(
  left: GroupDragConfig | undefined,
  right: GroupDragConfig | undefined,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return areProjectedDropTargetsEqual(left.projectedDropTarget, right.projectedDropTarget)
    && left.flashedGroupId === right.flashedGroupId
    && left.isDragActive === right.isDragActive
    && left.shouldSuppressActivation === right.shouldSuppressActivation;
}

function areGroupCardPropsEqual(left: GroupCardProps, right: GroupCardProps) {
  return areGroupViewsEqual(left.group, right.group)
    && left.activeWorksheetId === right.activeWorksheetId
    && left.contextMenuOpenId === right.contextMenuOpenId
    && left.groupMenuOpenId === right.groupMenuOpenId
    && areGroupDragConfigsEqual(left.dragConfig, right.dragConfig)
    && left.isRenaming === right.isRenaming
    && left.onActivate === right.onActivate
    && left.onToggleCollapsed === right.onToggleCollapsed
    && left.onOpenGroupMenu === right.onOpenGroupMenu
    && left.onOpenSheetMenu === right.onOpenSheetMenu
    && left.onTogglePin === right.onTogglePin
    && left.onRenameSubmit === right.onRenameSubmit
    && left.onRenameCancel === right.onRenameCancel
    && left.renamingWorksheetId === right.renamingWorksheetId
    && left.onRenameWorksheetSubmit === right.onRenameWorksheetSubmit
    && left.onStartRenameWorksheet === right.onStartRenameWorksheet
    && left.navigableId === right.navigableId
    && left.isFocused === right.isFocused
    && left.isVisualFocused === right.isVisualFocused
    && left.isVisualExiting === right.isVisualExiting
    && left.isActiveDimmed === right.isActiveDimmed
    && left.onGroupHeaderKeyDown === right.onGroupHeaderKeyDown
    && left.registerElement === right.registerElement
    && left.visualFocusedItemId === right.visualFocusedItemId
    && left.visualExitingItemId === right.visualExitingItemId
    && left.onItemKeyDown === right.onItemKeyDown;
}

function GroupCardComponent({
  group,
  onToggleCollapsed,
  onOpenGroupMenu,
  onOpenSheetMenu,
  isRenaming,
  onRenameSubmit,
  onRenameCancel,
  renamingWorksheetId,
  onRenameWorksheetSubmit,
  onStartRenameWorksheet,
  navigableId,
  isFocused = false,
  isVisualFocused = false,
  isVisualExiting = false,
  isActiveDimmed = false,
  onGroupHeaderKeyDown,
  registerElement,
  ...rest
}: GroupCardProps) {
  const [isEmptyFeedbackActive, setIsEmptyFeedbackActive] = useState(false);
  const emptyFeedbackTimeoutRef = useRef<number | null>(null);
  const headerButtonRef = useRef<HTMLButtonElement>(null);

  const clearEmptyFeedbackTimeout = useCallback(() => {
    if (emptyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(emptyFeedbackTimeoutRef.current);
      emptyFeedbackTimeoutRef.current = null;
    }
  }, []);

  const triggerEmptyFeedback = useCallback(() => {
    clearEmptyFeedbackTimeout();
    setIsEmptyFeedbackActive(false);
    window.requestAnimationFrame(() => {
      setIsEmptyFeedbackActive(true);
      emptyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setIsEmptyFeedbackActive(false);
        emptyFeedbackTimeoutRef.current = null;
      }, 520);
    });
  }, [clearEmptyFeedbackTimeout]);

  useEffect(() => {
    return () => {
      clearEmptyFeedbackTimeout();
    };
  }, [clearEmptyFeedbackTimeout]);

  // Register DOM element for focus management
  useEffect(() => {
    if (!navigableId || !registerElement) {
      return undefined;
    }

    registerElement(navigableId, headerButtonRef.current);

    return () => {
      registerElement(navigableId, null);
    };
  }, [navigableId, registerElement]);

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
  const containsActiveWorksheet = group.worksheets.some(
    (w) => w.worksheetId === rest.activeWorksheetId
  );
  const isActiveGroupHeader = group.isCollapsed && containsActiveWorksheet;
  const shouldShowEmptyGhost = isEmptyFeedbackActive && group.worksheets.length === 0;

  function handleToggleCollapsed() {
    onToggleCollapsed(group.groupId);

    if (dragConfig?.isDragActive || isRenaming || group.worksheets.length > 0) {
      return;
    }

    triggerEmptyFeedback();
  }

  // Determine tabIndex: use roving tabindex when navigableId is provided
  const tabIndex = navigableId ? (isFocused ? 0 : -1) : 0;

  return (
    <section
      className="group-card"
      onContextMenu={(event) => {
        event.preventDefault();
        const interaction = inferContextMenuInteraction(event);
        const rawTarget = event.target;
        const targetElement = rawTarget instanceof Element
          ? rawTarget
          : rawTarget instanceof Node
            ? rawTarget.parentElement
            : null;
        const anchorTarget = targetElement?.closest<HTMLElement>('[data-navigable-id]') ?? null;
        onOpenGroupMenu({
          target: anchorTarget ?? event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          groupId: group.groupId,
          groupName: group.name,
          colorToken: group.colorToken,
          interaction,
        });
      }}
    >
      <header
        ref={setNodeRef}
        className={`group-header ${group.groupId === rest.groupMenuOpenId ? 'group-header-context-open' : ''} ${isDropActive ? 'group-header-drop-active' : ''} ${isActiveGroupHeader ? 'group-header-active' : ''}`}
        data-navigable-id={navigableId}
        data-active={isActiveGroupHeader ? 'true' : 'false'}
        data-focused={navigableId ? isFocused : undefined}
        data-visual-focused={navigableId ? isVisualFocused : undefined}
        data-visual-exiting={navigableId ? isVisualExiting : undefined}
        data-active-dimmed={isActiveDimmed ? 'true' : 'false'}
      >
        <span className="group-header-nav-highlight" aria-hidden="true" />
        <button
          ref={headerButtonRef}
          className="group-toggle"
          type="button"
          aria-expanded={!group.isCollapsed}
          tabIndex={tabIndex}
          onClick={() => {
            if (isRenaming) {
              return;
            }

            handleToggleCollapsed();
          }}
          onKeyDown={(event) => {
            if (navigableId && onGroupHeaderKeyDown) {
              const managedNavigationKey = event.key === 'ArrowDown'
                || event.key === 'ArrowUp'
                || event.key === 'ArrowRight'
                || event.key === 'ArrowLeft'
                || event.key === 'Enter'
                || event.key === 'Home'
                || event.key === 'End';

              if (managedNavigationKey) {
                onGroupHeaderKeyDown(event, group.groupId, group.isCollapsed);
                return;
              }
            }
          }}
        >
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

      {shouldShowEmptyGhost ? <div className="group-empty-ghost" aria-hidden="true" /> : null}

      {!group.isCollapsed ? (
        <SheetList
          worksheets={group.worksheets}
          activeWorksheetId={rest.activeWorksheetId}
          contextMenuOpenId={rest.contextMenuOpenId}
          renamingWorksheetId={renamingWorksheetId}
          dragConfig={sheetListDragConfig}
          visualFocusedItemId={rest.visualFocusedItemId}
          visualExitingItemId={rest.visualExitingItemId}
          onActivate={rest.onActivate}
          onTogglePin={rest.onTogglePin}
          onOpenContextMenu={onOpenSheetMenu}
          onRenameSubmit={onRenameWorksheetSubmit}
          onRenameCancel={onRenameCancel}
          onStartRenameWorksheet={onStartRenameWorksheet}
          onItemKeyDown={rest.onItemKeyDown}
          registerElement={registerElement}
        />
      ) : null}
    </section>
  );
}

export const GroupCard = memo(GroupCardComponent, areGroupCardPropsEqual);
