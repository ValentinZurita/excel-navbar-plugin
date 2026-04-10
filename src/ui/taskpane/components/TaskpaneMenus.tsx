import type { ReactNode } from 'react';
import type { GroupEntity, WorksheetEntity } from '../../../domain/navigation/types';
import type { GroupMenuState, SheetMenuState } from '../types/contextMenuTypes';
import {
  AddGroupMenuIcon,
  DeleteMenuIcon,
  EyeIcon,
  EyeOffIcon,
  MoveMenuIcon,
  PinMenuIcon,
  PinOffMenuIcon,
  RemoveMenuIcon,
  RenameMenuIcon,
} from '../../icons';
import '../styles/TaskpaneMenus.css';

interface TaskpaneMenusProps {
  sheetMenu: SheetMenuState | null;
  groupMenu: GroupMenuState | null;
  availableGroupOptions: GroupEntity[];
  onCloseMenus: () => void;
  onTogglePin: (worksheet: WorksheetEntity) => void;
  onToggleVisibility: (worksheet: WorksheetEntity) => void;
  onRenameWorksheet: (worksheet: WorksheetEntity) => void;
  onMoveToGroup: (worksheetId: string, groupId: string) => void;
  onRemoveFromGroup: (worksheetId: string) => void;
  onCreateGroup: () => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className="context-menu-item" onClick={onClick}>
      <span className="context-menu-icon" aria-hidden="true">{icon}</span>
      <span className="context-menu-label">{label}</span>
    </button>
  );
}

function getMenuStyle(menu: SheetMenuState | GroupMenuState) {
  // Clamp menu position so it never renders outside the taskpane viewport.
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : Number.MAX_SAFE_INTEGER;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : Number.MAX_SAFE_INTEGER;

  return {
    top: Math.min(menu.y + 6, viewportHeight - 220),
    left: Math.min(menu.x + 6, viewportWidth - 260),
  };
}

export function TaskpaneMenus({
  sheetMenu,
  groupMenu,
  availableGroupOptions,
  onCloseMenus,
  onTogglePin,
  onToggleVisibility,
  onRenameWorksheet,
  onMoveToGroup,
  onRemoveFromGroup,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: TaskpaneMenusProps) {
  const activeMenu = sheetMenu ?? groupMenu;
  const menuStyle = activeMenu ? getMenuStyle(activeMenu) : undefined;

  return (
    <>
      {/* Worksheet context menu with pin/visibility/group actions. */}
      {menuStyle && sheetMenu ? (
        <div className="context-menu-layer" onClick={onCloseMenus} onContextMenu={(event) => { event.preventDefault(); onCloseMenus(); }}>
          <div
            className="context-menu"
            style={menuStyle}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.stopPropagation()}
          >
            <MenuItem
              icon={
                sheetMenu.worksheet.isPinned ? (
                  <PinOffMenuIcon className="context-menu-icon-svg" />
                ) : (
                  <PinMenuIcon className="context-menu-icon-svg" />
                )
              }
              label={sheetMenu.worksheet.isPinned ? 'Unpin tab' : 'Pin tab'}
              onClick={() => {
                onTogglePin(sheetMenu.worksheet);
                onCloseMenus();
              }}
            />
            <MenuItem
              icon={
                sheetMenu.worksheet.visibility === 'Visible' ? (
                  <EyeOffIcon className="context-menu-icon-svg" />
                ) : (
                  <EyeIcon className="context-menu-icon-svg" />
                )
              }
              label={sheetMenu.worksheet.visibility === 'Visible' ? 'Hide sheet' : 'Unhide sheet'}
              onClick={() => {
                onToggleVisibility(sheetMenu.worksheet);
                onCloseMenus();
              }}
            />
            <MenuItem
              icon={<RenameMenuIcon className="context-menu-icon-svg" />}
              label="Rename"
              onClick={() => {
                onRenameWorksheet(sheetMenu.worksheet);
              }}
            />
            {availableGroupOptions.map((group) => (
              <MenuItem
                key={group.groupId}
                icon={<MoveMenuIcon className="context-menu-icon-svg" />}
                label={`Move to ${group.name}`}
                onClick={() => {
                  onMoveToGroup(sheetMenu.worksheet.worksheetId, group.groupId);
                  onCloseMenus();
                }}
              />
            ))}
            {sheetMenu.worksheet.groupId ? (
              <MenuItem
                icon={<RemoveMenuIcon className="context-menu-icon-svg" />}
                label="Remove from group"
                onClick={() => {
                  onRemoveFromGroup(sheetMenu.worksheet.worksheetId);
                  onCloseMenus();
                }}
              />
            ) : null}
            <MenuItem
              icon={<AddGroupMenuIcon className="context-menu-icon-svg" />}
              label="New group"
              onClick={() => {
                onCreateGroup();
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Group-level menu with rename/delete/create actions. */}
      {menuStyle && groupMenu ? (
        <div className="context-menu-layer" onClick={onCloseMenus}>
          <div className="context-menu" style={menuStyle} onClick={(event) => event.stopPropagation()}>
            <MenuItem
              icon={<RenameMenuIcon className="context-menu-icon-svg" />}
              label="Rename group"
              onClick={() => {
                onRenameGroup(groupMenu.groupId, groupMenu.groupName);
              }}
            />
            <MenuItem
              icon={<DeleteMenuIcon className="context-menu-icon-svg" />}
              label="Delete group"
              onClick={() => {
                onDeleteGroup(groupMenu.groupId, groupMenu.groupName);
                onCloseMenus();
              }}
            />
            <MenuItem
              icon={<AddGroupMenuIcon className="context-menu-icon-svg" />}
              label="New group"
              onClick={() => {
                onCreateGroup();
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
