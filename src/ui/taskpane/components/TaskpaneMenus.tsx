import { useState, type ReactNode } from 'react';
import type { GroupColorToken, WorksheetEntity } from '../../../domain/navigation/types';
import { selectableGroupColorTokens } from '../../../domain/navigation/constants';
import type { ContextMenuState, GroupMenuState, SheetMenuState } from '../types/contextMenuTypes';
import {
  AddGroupMenuIcon,
  DeleteMenuIcon,
  EyeIcon,
  EyeOffIcon,
  PinMenuIcon,
  PinOffMenuIcon,
  RemoveMenuIcon,
  RenameMenuIcon,
} from '../../icons';
import { InlineGroupCreator } from '../../components/InlineGroupCreator';
import '../styles/TaskpaneMenus.css';

interface MenuAction {
  key: string;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
}

interface TaskpaneMenusProps {
  activeMenu: ContextMenuState | null;
  onCloseMenus: () => void;
  onTogglePin: (worksheet: WorksheetEntity) => void;
  onToggleVisibility: (worksheet: WorksheetEntity) => void;
  onRenameWorksheet: (worksheet: WorksheetEntity) => void;
  onRemoveFromGroup: (worksheetId: string) => void;
  onStartCreatingGroup: (initialWorksheetId?: string) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  onSetGroupColor: (groupId: string, colorToken: GroupColorToken) => void;
  // Inline creation state
  isCreatingGroup: boolean;
  onCancelCreatingGroup: () => void;
  onConfirmCreatingGroup: (name: string, colorToken: GroupColorToken) => void;
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

function renderMenuActions(actions: MenuAction[]) {
  return actions.map((action) => (
    <MenuItem key={action.key} icon={action.icon} label={action.label} onClick={action.onSelect} />
  ));
}

function ContextMenuLayer({ children, menu, onCloseMenus }: { children: ReactNode; menu: ContextMenuState; onCloseMenus: () => void }) {
  return (
    <div
      className="context-menu-layer"
      onClick={onCloseMenus}
      onContextMenu={(event) => {
        event.preventDefault();
        onCloseMenus();
      }}
    >
      <div
        className="context-menu"
        style={getMenuStyle(menu)}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function buildSheetMenuActions(
  sheetMenu: SheetMenuState,
  handlers: Pick<
    TaskpaneMenusProps,
    'onCloseMenus' | 'onTogglePin' | 'onToggleVisibility' | 'onRenameWorksheet' | 'onRemoveFromGroup' | 'onStartCreatingGroup'
  >,
): MenuAction[] {
  const actions: MenuAction[] = [
    {
      key: 'toggle-pin',
      icon: sheetMenu.worksheet.isPinned ? (
        <PinOffMenuIcon className="context-menu-icon-svg" />
      ) : (
        <PinMenuIcon className="context-menu-icon-svg" />
      ),
      label: sheetMenu.worksheet.isPinned ? 'Unpin tab' : 'Pin tab',
      onSelect: () => {
        handlers.onTogglePin(sheetMenu.worksheet);
        handlers.onCloseMenus();
      },
    },
    {
      key: 'toggle-visibility',
      icon: sheetMenu.worksheet.visibility === 'Visible' ? (
        <EyeOffIcon className="context-menu-icon-svg" />
      ) : (
        <EyeIcon className="context-menu-icon-svg" />
      ),
      label: sheetMenu.worksheet.visibility === 'Visible' ? 'Hide sheet' : 'Unhide sheet',
      onSelect: () => {
        handlers.onToggleVisibility(sheetMenu.worksheet);
        handlers.onCloseMenus();
      },
    },
    {
      key: 'rename',
      icon: <RenameMenuIcon className="context-menu-icon-svg" />,
      label: 'Rename',
      onSelect: () => {
        handlers.onRenameWorksheet(sheetMenu.worksheet);
      },
    },
  ];

  if (sheetMenu.worksheet.groupId) {
    actions.push({
      key: 'remove-from-group',
      icon: <RemoveMenuIcon className="context-menu-icon-svg" />,
      label: 'Remove from group',
      onSelect: () => {
        handlers.onRemoveFromGroup(sheetMenu.worksheet.worksheetId);
        handlers.onCloseMenus();
      },
    });
  }

  actions.push({
    key: 'new-group',
    icon: <AddGroupMenuIcon className="context-menu-icon-svg" />,
    label: 'New group',
    onSelect: () => {
      handlers.onStartCreatingGroup(sheetMenu.worksheet.worksheetId);
    },
  });

  return actions;
}

// Lista de colores disponibles para el picker — importada desde dominio para consistencia.

function isColorNone(color: GroupColorToken): color is 'none' {
  return color === 'none';
}

function buildGroupMenuActions(
  groupMenu: GroupMenuState,
  handlers: Pick<TaskpaneMenusProps, 'onCloseMenus' | 'onStartCreatingGroup' | 'onRenameGroup' | 'onDeleteGroup' | 'onSetGroupColor'>,
  onOpenColorPicker: (open: boolean) => void,
): MenuAction[] {
  return [
    {
      key: 'rename-group',
      icon: <RenameMenuIcon className="context-menu-icon-svg" />,
      label: 'Rename group',
      onSelect: () => {
        handlers.onRenameGroup(groupMenu.groupId, groupMenu.groupName);
      },
    },
    {
      key: 'change-color-group',
      icon: isColorNone(groupMenu.colorToken) ? (
        <span className="context-menu-color-preview context-menu-color-preview-none" />
      ) : (
        <span
          className="context-menu-color-preview"
          style={{ backgroundColor: `var(--group-color-${groupMenu.colorToken})` }}
        />
      ),
      label: 'Change color',
      onSelect: () => {
        onOpenColorPicker(true);
      },
    },
    {
      key: 'delete-group',
      icon: <DeleteMenuIcon className="context-menu-icon-svg" />,
      label: 'Delete group',
      onSelect: () => {
        handlers.onDeleteGroup(groupMenu.groupId, groupMenu.groupName);
        handlers.onCloseMenus();
      },
    },
    {
      key: 'new-group',
      icon: <AddGroupMenuIcon className="context-menu-icon-svg" />,
      label: 'New group',
      onSelect: () => {
        handlers.onStartCreatingGroup();
      },
    },
  ];
}

function SheetContextMenu({
  sheetMenu,
  onCloseMenus,
  onTogglePin,
  onToggleVisibility,
  onRenameWorksheet,
  onRemoveFromGroup,
  onStartCreatingGroup,
  isCreatingGroup,
  onCancelCreatingGroup,
  onConfirmCreatingGroup,
}: {
  sheetMenu: SheetMenuState;
  onCloseMenus: () => void;
  onTogglePin: (worksheet: WorksheetEntity) => void;
  onToggleVisibility: (worksheet: WorksheetEntity) => void;
  onRenameWorksheet: (worksheet: WorksheetEntity) => void;
  onRemoveFromGroup: (worksheetId: string) => void;
  onStartCreatingGroup: (initialWorksheetId?: string) => void;
  isCreatingGroup: boolean;
  onCancelCreatingGroup: () => void;
  onConfirmCreatingGroup: (name: string, colorToken: GroupColorToken) => void;
}) {
  const actions = buildSheetMenuActions(sheetMenu, {
    onCloseMenus,
    onTogglePin,
    onToggleVisibility,
    onRenameWorksheet,
    onRemoveFromGroup,
    onStartCreatingGroup,
  });

  return (
    <ContextMenuLayer menu={sheetMenu} onCloseMenus={onCloseMenus}>
      {isCreatingGroup ? (
        <InlineGroupCreator
          onCreate={onConfirmCreatingGroup}
          onCancel={onCancelCreatingGroup}
          onCloseMenu={onCloseMenus}
        />
      ) : (
        renderMenuActions(actions)
      )}
    </ContextMenuLayer>
  );
}

function GroupContextMenu({
  groupMenu,
  onCloseMenus,
  onStartCreatingGroup,
  onRenameGroup,
  onDeleteGroup,
  onSetGroupColor,
  isCreatingGroup,
  onCancelCreatingGroup,
  onConfirmCreatingGroup,
}: {
  groupMenu: GroupMenuState;
  onCloseMenus: () => void;
  onStartCreatingGroup: (initialWorksheetId?: string) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  onSetGroupColor: (groupId: string, colorToken: GroupColorToken) => void;
  isCreatingGroup: boolean;
  onCancelCreatingGroup: () => void;
  onConfirmCreatingGroup: (name: string, colorToken: GroupColorToken) => void;
}) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const actions = buildGroupMenuActions(groupMenu, {
    onCloseMenus,
    onStartCreatingGroup,
    onRenameGroup,
    onDeleteGroup,
    onSetGroupColor,
  }, setIsColorPickerOpen);

  function handleColorSelect(color: GroupColorToken) {
    onSetGroupColor(groupMenu.groupId, color);
    onCloseMenus();
  }

  return (
    <ContextMenuLayer menu={groupMenu} onCloseMenus={onCloseMenus}>
      {isCreatingGroup ? (
        <InlineGroupCreator
          onCreate={onConfirmCreatingGroup}
          onCancel={onCancelCreatingGroup}
          onCloseMenu={onCloseMenus}
        />
      ) : isColorPickerOpen ? (
        <div className="context-menu-color-picker">
          <div className="context-menu-color-picker-header">Select color</div>
          <div className="context-menu-color-picker-grid">
            {selectableGroupColorTokens.map((color) => (
              isColorNone(color) ? (
                <button
                  key={color}
                  type="button"
                  className={`context-menu-color-picker-item context-menu-color-picker-item-none ${
                    groupMenu.colorToken === color ? 'context-menu-color-picker-item-selected' : ''
                  }`}
                  aria-label="No color"
                  aria-pressed={groupMenu.colorToken === color}
                  onClick={() => handleColorSelect(color)}
                />
              ) : (
                <button
                  key={color}
                  type="button"
                  className={`context-menu-color-picker-item ${
                    groupMenu.colorToken === color ? 'context-menu-color-picker-item-selected' : ''
                  }`}
                  style={{ backgroundColor: `var(--group-color-${color})` }}
                  aria-label={`Select ${color}`}
                  aria-pressed={groupMenu.colorToken === color}
                  onClick={() => handleColorSelect(color)}
                />
              )
            ))}
          </div>
          <button
            type="button"
            className="context-menu-color-picker-cancel"
            onClick={() => setIsColorPickerOpen(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        renderMenuActions(actions)
      )}
    </ContextMenuLayer>
  );
}

export function TaskpaneMenus({
  activeMenu,
  onCloseMenus,
  onTogglePin,
  onToggleVisibility,
  onRenameWorksheet,
  onRemoveFromGroup,
  onStartCreatingGroup,
  onRenameGroup,
  onDeleteGroup,
  onSetGroupColor,
  isCreatingGroup,
  onCancelCreatingGroup,
  onConfirmCreatingGroup,
}: TaskpaneMenusProps) {
  if (!activeMenu) {
    return null;
  }

  if (activeMenu.kind === 'sheet') {
    return (
      <SheetContextMenu
        sheetMenu={activeMenu}
        onCloseMenus={onCloseMenus}
        onTogglePin={onTogglePin}
        onToggleVisibility={onToggleVisibility}
        onRenameWorksheet={onRenameWorksheet}
        onRemoveFromGroup={onRemoveFromGroup}
        onStartCreatingGroup={onStartCreatingGroup}
        isCreatingGroup={isCreatingGroup}
        onCancelCreatingGroup={onCancelCreatingGroup}
        onConfirmCreatingGroup={onConfirmCreatingGroup}
      />
    );
  }

  return (
    <GroupContextMenu
      groupMenu={activeMenu}
      onCloseMenus={onCloseMenus}
      onStartCreatingGroup={onStartCreatingGroup}
      onRenameGroup={onRenameGroup}
      onDeleteGroup={onDeleteGroup}
      onSetGroupColor={onSetGroupColor}
      isCreatingGroup={isCreatingGroup}
      onCancelCreatingGroup={onCancelCreatingGroup}
      onConfirmCreatingGroup={onConfirmCreatingGroup}
    />
  );
}
