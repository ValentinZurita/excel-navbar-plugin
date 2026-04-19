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
import { InlineDeleteConfirmation } from '../../components/InlineDeleteConfirmation';
import '../styles/TaskpaneMenus.css';

/** Sheet row context menu — one vocabulary (“sheet”) for pin, visibility, and delete. */
const SHEET_CONTEXT_MENU_LABELS = {
  pinSheet: 'Pin sheet',
  unpinSheet: 'Unpin sheet',
  hideSheet: 'Hide sheet',
  unhideSheet: 'Unhide sheet',
  deleteSheet: 'Delete sheet',
} as const;

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
  onRemoveFromGroup: (worksheetId: string, targetIndex?: number) => void;
  onStartCreatingGroup: (initialWorksheetId?: string) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  deleteGroupRequest: { groupId: string; groupName: string } | null;
  onCancelDeleteGroup: () => void;
  onConfirmDeleteGroup: () => void;
  onSetGroupColor: (groupId: string, colorToken: GroupColorToken) => void;
  // Inline creation state
  isCreatingGroup: boolean;
  onCancelCreatingGroup: () => void;
  onConfirmCreatingGroup: (name: string, colorToken: GroupColorToken) => void;
  // Inline delete confirmation state
  isConfirmingDelete: boolean;
  worksheetToDelete: WorksheetEntity | null;
  onStartDeleteConfirmation: (worksheet: WorksheetEntity) => void;
  onCancelDeleteConfirmation: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  deleteError: string | null;
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
    'onCloseMenus' | 'onTogglePin' | 'onToggleVisibility' | 'onRenameWorksheet' | 'onRemoveFromGroup' | 'onStartCreatingGroup' | 'onStartDeleteConfirmation'
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
      label: sheetMenu.worksheet.isPinned
        ? SHEET_CONTEXT_MENU_LABELS.unpinSheet
        : SHEET_CONTEXT_MENU_LABELS.pinSheet,
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
      label: sheetMenu.worksheet.visibility === 'Visible'
        ? SHEET_CONTEXT_MENU_LABELS.hideSheet
        : SHEET_CONTEXT_MENU_LABELS.unhideSheet,
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

  // Destructive action at the end
  actions.push({
    key: 'delete-sheet',
    icon: <DeleteMenuIcon className="context-menu-icon-svg" />,
    label: SHEET_CONTEXT_MENU_LABELS.deleteSheet,
    onSelect: () => {
      handlers.onStartDeleteConfirmation(sheetMenu.worksheet);
      // Don't close menu - show inline confirmation instead
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
  handlers: Pick<TaskpaneMenusProps, 'onStartCreatingGroup' | 'onRenameGroup' | 'onDeleteGroup' | 'onSetGroupColor'>,
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
      key: 'ungroup',
      icon: <DeleteMenuIcon className="context-menu-icon-svg" />,
      label: 'Ungroup',
      onSelect: () => {
        handlers.onDeleteGroup(groupMenu.groupId, groupMenu.groupName);
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
  onStartDeleteConfirmation,
  isCreatingGroup,
  onCancelCreatingGroup,
  onConfirmCreatingGroup,
  isConfirmingDelete,
  worksheetToDelete,
  onCancelDeleteConfirmation,
  onConfirmDelete,
  isDeleting,
  deleteError,
}: {
  sheetMenu: SheetMenuState;
  onCloseMenus: () => void;
  onTogglePin: (worksheet: WorksheetEntity) => void;
  onToggleVisibility: (worksheet: WorksheetEntity) => void;
  onRenameWorksheet: (worksheet: WorksheetEntity) => void;
  onRemoveFromGroup: (worksheetId: string, targetIndex?: number) => void;
  onStartCreatingGroup: (initialWorksheetId?: string) => void;
  onStartDeleteConfirmation: (worksheet: WorksheetEntity) => void;
  isCreatingGroup: boolean;
  onCancelCreatingGroup: () => void;
  onConfirmCreatingGroup: (name: string, colorToken: GroupColorToken) => void;
  isConfirmingDelete: boolean;
  worksheetToDelete: WorksheetEntity | null;
  onCancelDeleteConfirmation: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  deleteError: string | null;
}) {
  const actions = buildSheetMenuActions(sheetMenu, {
    onCloseMenus,
    onTogglePin,
    onToggleVisibility,
    onRenameWorksheet,
    onRemoveFromGroup,
    onStartCreatingGroup,
    onStartDeleteConfirmation,
  });

  return (
    <ContextMenuLayer menu={sheetMenu} onCloseMenus={onCloseMenus}>
      {isConfirmingDelete && worksheetToDelete ? (
        <InlineDeleteConfirmation
          worksheetName={worksheetToDelete.name}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDeleteConfirmation}
          onCloseMenu={onCloseMenus}
          isDeleting={isDeleting}
          error={deleteError}
        />
      ) : isCreatingGroup ? (
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
  deleteGroupRequest,
  onCancelDeleteGroup,
  onConfirmDeleteGroup,
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
  deleteGroupRequest: { groupId: string; groupName: string } | null;
  onCancelDeleteGroup: () => void;
  onConfirmDeleteGroup: () => void;
  isCreatingGroup: boolean;
  onCancelCreatingGroup: () => void;
  onConfirmCreatingGroup: (name: string, colorToken: GroupColorToken) => void;
}) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const actions = buildGroupMenuActions(groupMenu, {
    onStartCreatingGroup,
    onRenameGroup,
    onDeleteGroup,
    onSetGroupColor,
  }, setIsColorPickerOpen);

  const isConfirmingGroupDelete = Boolean(
    deleteGroupRequest && deleteGroupRequest.groupId === groupMenu.groupId,
  );

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
      ) : isConfirmingGroupDelete ? (
        <InlineDeleteConfirmation
          message={deleteGroupRequest ? `Ungroup '${deleteGroupRequest.groupName}'? Sheets become independent.` : undefined}
          confirmLabel="Ungroup"
          cancelLabel="Cancel"
          confirmAriaLabel={deleteGroupRequest ? `Confirm ungroup ${deleteGroupRequest.groupName}` : 'Confirm ungroup'}
          cancelAriaLabel="Cancel ungroup"
          onConfirm={async () => {
            onConfirmDeleteGroup();
          }}
          onCancel={onCancelDeleteGroup}
          onCloseMenu={onCloseMenus}
        />
      ) : isColorPickerOpen ? (
        <div className="context-menu-color-picker">
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
  deleteGroupRequest,
  onCancelDeleteGroup,
  onConfirmDeleteGroup,
  onSetGroupColor,
  isCreatingGroup,
  onCancelCreatingGroup,
  onConfirmCreatingGroup,
  isConfirmingDelete,
  worksheetToDelete,
  onStartDeleteConfirmation,
  onCancelDeleteConfirmation,
  onConfirmDelete,
  isDeleting,
  deleteError,
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
        onStartDeleteConfirmation={onStartDeleteConfirmation}
        isCreatingGroup={isCreatingGroup}
        onCancelCreatingGroup={onCancelCreatingGroup}
        onConfirmCreatingGroup={onConfirmCreatingGroup}
        isConfirmingDelete={isConfirmingDelete}
        worksheetToDelete={worksheetToDelete}
        onCancelDeleteConfirmation={onCancelDeleteConfirmation}
        onConfirmDelete={onConfirmDelete}
        isDeleting={isDeleting}
        deleteError={deleteError}
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
      deleteGroupRequest={deleteGroupRequest}
      onCancelDeleteGroup={onCancelDeleteGroup}
      onConfirmDeleteGroup={onConfirmDeleteGroup}
      onSetGroupColor={onSetGroupColor}
      isCreatingGroup={isCreatingGroup}
      onCancelCreatingGroup={onCancelCreatingGroup}
      onConfirmCreatingGroup={onConfirmCreatingGroup}
    />
  );
}
