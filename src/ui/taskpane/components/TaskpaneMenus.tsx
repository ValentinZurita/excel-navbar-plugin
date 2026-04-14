import { type ReactNode } from 'react';
import type { GroupColorToken, WorksheetEntity } from '../../../domain/navigation/types';
import { selectableGroupColorTokens } from '../../../domain/navigation/constants';
import type { ContextMenuState, GroupMenuState, SheetMenuState } from '../types/contextMenuTypes';
import {
  AddGroupMenuIcon,
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
  onSetGroupColor,
  isCreatingGroup,
  onCancelCreatingGroup,
  onConfirmCreatingGroup,
}: {
  groupMenu: GroupMenuState;
  onCloseMenus: () => void;
  onStartCreatingGroup: (initialWorksheetId?: string) => void;
  onSetGroupColor: (groupId: string, colorToken: GroupColorToken) => void;
  isCreatingGroup: boolean;
  onCancelCreatingGroup: () => void;
  onConfirmCreatingGroup: (name: string, colorToken: GroupColorToken) => void;
}) {
  function handleColorSelect(color: GroupColorToken) {
    onSetGroupColor(groupMenu.groupId, color);
    onCloseMenus();
  }

  if (isCreatingGroup) {
    return (
      <ContextMenuLayer menu={groupMenu} onCloseMenus={onCloseMenus}>
        <InlineGroupCreator
          onCreate={onConfirmCreatingGroup}
          onCancel={onCancelCreatingGroup}
          onCloseMenu={onCloseMenus}
        />
      </ContextMenuLayer>
    );
  }

  // Color picker — shown directly, no intermediate state or cancel button.
  // Clicking outside the menu closes it naturally via ContextMenuLayer.
  return (
    <ContextMenuLayer menu={groupMenu} onCloseMenus={onCloseMenus}>
      <div className="context-menu-color-picker">
        <div className="context-menu-color-picker-grid" role="group" aria-label="Color options">
          {selectableGroupColorTokens.map((color) =>
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
            ),
          )}
        </div>
      </div>
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
      onSetGroupColor={onSetGroupColor}
      isCreatingGroup={isCreatingGroup}
      onCancelCreatingGroup={onCancelCreatingGroup}
      onConfirmCreatingGroup={onConfirmCreatingGroup}
    />
  );
}
