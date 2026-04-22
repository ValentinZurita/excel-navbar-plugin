import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { GroupColorToken, WorksheetEntity } from '../../../domain/navigation/types';
import { selectableGroupColorTokens } from '../../../domain/navigation/constants';
import type {
  ContextMenuState,
  DeleteGroupRequest,
  GroupMenuState,
  SheetMenuState,
} from '../types/contextMenuTypes';
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
  onRestoreKeyboardMenuFocus?: (itemId: string) => void;
  onTogglePin: (worksheet: WorksheetEntity) => void;
  onToggleVisibility: (worksheet: WorksheetEntity) => void;
  onRenameWorksheet: (worksheet: WorksheetEntity) => void;
  onRemoveFromGroup: (worksheetId: string, targetIndex?: number) => void;
  onStartCreatingGroup: (initialWorksheetId?: string) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  onDeleteGroupAndSheets: (groupId: string, groupName: string) => void;
  deleteGroupRequest: DeleteGroupRequest | null;
  onCancelDeleteGroup: () => void;
  onConfirmDeleteGroup: () => void | Promise<void>;
  isDeletingGroupSheets?: boolean;
  deleteGroupSheetsError?: string | null;
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

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="context-menu-item"
      onClick={onClick}
    >
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
    <MenuItem
      key={action.key}
      icon={action.icon}
      label={action.label}
      onClick={action.onSelect}
    />
  ));
}

function ContextMenuLayer({
  children,
  menu,
  onCloseMenus,
  menuPanelRef,
}: {
  children: ReactNode;
  menu: ContextMenuState;
  onCloseMenus: () => void;
  menuPanelRef?: RefObject<HTMLDivElement>;
}) {
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
        ref={menuPanelRef}
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

function collectSheetMenuListItems(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>('.context-menu-item')].filter(
    (el) => !(el as HTMLButtonElement).disabled,
  );
}

/** Hosts like Excel webviews may not set keydown.target to the focused node; use focus + closest item. */
function resolveSheetMenuListItemFocus(panel: HTMLElement): HTMLButtonElement | null {
  const ae = document.activeElement;
  if (!(ae instanceof HTMLElement) || !panel.contains(ae)) {
    return null;
  }
  if (ae.classList.contains('context-menu-item') && ae instanceof HTMLButtonElement && !ae.disabled) {
    return ae;
  }
  const host = ae.closest('.context-menu-item');
  return host instanceof HTMLButtonElement && !host.disabled ? host : null;
}

function blurNavigableHostIfFocused() {
  const ae = document.activeElement;
  if (!(ae instanceof HTMLElement)) {
    return;
  }
  if (ae.closest('[data-navigable-id]')) {
    ae.blur();
  }
}

function focusNavigableHostById(navigableId: string | null | undefined) {
  if (!navigableId) {
    return;
  }

  const anchor = document.querySelector<HTMLElement>(`[data-navigable-id="${navigableId}"]`);
  if (!anchor || !document.contains(anchor)) {
    return;
  }

  const SUPPRESS_ATTR = 'data-suppress-nav-focus-ring';
  let cleared = false;
  const clearSuppress = () => {
    if (cleared) {
      return;
    }
    cleared = true;
    anchor.removeEventListener('blur', onBlur);
    anchor.removeAttribute(SUPPRESS_ATTR);
  };
  const onBlur = () => {
    clearSuppress();
  };

  anchor.addEventListener('blur', onBlur, { once: true });
  anchor.setAttribute(SUPPRESS_ATTR, 'true');
  anchor.focus({ preventScroll: true });
}

/**
 * Keyboard control when the sheet menu was opened via ArrowRight (not pointer).
 * Blurs the navigator row first so Excel-green :focus-visible rings do not linger;
 * registers capture only in this mode so pointer-opened menus behave as before.
 */
function useSheetContextMenuListKeyboard(args: {
  menuPanelRef: RefObject<HTMLDivElement>;
  isEnabled: boolean;
  keyboardOpened: boolean;
  onCloseMenus: () => void;
  onRestoreKeyboardMenuFocus?: (itemId: string) => void;
  anchorNavigableId?: string | null;
  menuInstanceKey: string;
}) {
  const {
    menuPanelRef,
    isEnabled,
    keyboardOpened,
    onCloseMenus,
    onRestoreKeyboardMenuFocus,
    anchorNavigableId,
    menuInstanceKey,
  } = args;

  useLayoutEffect(() => {
    if (!isEnabled || !keyboardOpened) {
      return;
    }

    let cancelled = false;
    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      blurNavigableHostIfFocused();
      innerFrame = window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        const panel = menuPanelRef.current;
        const items = panel ? collectSheetMenuListItems(panel) : [];
        items[0]?.focus({ preventScroll: true });
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outerFrame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [isEnabled, keyboardOpened, menuInstanceKey, menuPanelRef]);

  useEffect(() => {
    if (!isEnabled || !keyboardOpened) {
      return undefined;
    }

    const closeAndRestoreKeyboardFocus = () => {
      if (anchorNavigableId) {
        onRestoreKeyboardMenuFocus?.(anchorNavigableId);
        focusNavigableHostById(anchorNavigableId);
      }
      onCloseMenus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const panel = menuPanelRef.current;
      if (!panel) {
        return;
      }

      const pathTarget = event.target instanceof Node ? event.target : null;
      const focusInsidePanel =
        document.activeElement instanceof Node && panel.contains(document.activeElement);
      const targetInsidePanel = Boolean(pathTarget && panel.contains(pathTarget));
      if (!focusInsidePanel && !targetInsidePanel) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeAndRestoreKeyboardFocus();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        closeAndRestoreKeyboardFocus();
        return;
      }

      const items = collectSheetMenuListItems(panel);
      if (items.length === 0) {
        return;
      }

      const focusedItem = resolveSheetMenuListItemFocus(panel);
      const currentIndex = focusedItem ? items.indexOf(focusedItem) : -1;

      if (event.key === 'Enter' && !event.repeat) {
        if (focusedItem) {
          event.preventDefault();
          event.stopPropagation();
          focusedItem.click();
        }
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? items.length - 1 : currentIndex - 1)
          : (currentIndex < 0 || currentIndex >= items.length - 1 ? 0 : currentIndex + 1);
        items[nextIndex]?.focus({ preventScroll: true });
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, items.length - 1);
        items[nextIndex]?.focus({ preventScroll: true });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex = currentIndex < 0
          ? items.length - 1
          : Math.max(0, currentIndex - 1);
        items[nextIndex]?.focus({ preventScroll: true });
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        event.stopPropagation();
        items[0]?.focus({ preventScroll: true });
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        items[items.length - 1]?.focus({ preventScroll: true });
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [anchorNavigableId, isEnabled, keyboardOpened, menuPanelRef, onCloseMenus, onRestoreKeyboardMenuFocus]);
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
  handlers: Pick<
    TaskpaneMenusProps,
    'onStartCreatingGroup' | 'onRenameGroup' | 'onDeleteGroup' | 'onDeleteGroupAndSheets' | 'onSetGroupColor'
  >,
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
      icon: <RemoveMenuIcon className="context-menu-icon-svg" />,
      label: 'Ungroup',
      onSelect: () => {
        handlers.onDeleteGroup(groupMenu.groupId, groupMenu.groupName);
      },
    },
    {
      key: 'delete-group-sheets',
      icon: <DeleteMenuIcon className="context-menu-icon-svg" />,
      label: 'Delete group and sheets',
      onSelect: () => {
        handlers.onDeleteGroupAndSheets(groupMenu.groupId, groupMenu.groupName);
      },
    },
  ];
}

function SheetContextMenu({
  sheetMenu,
  onCloseMenus,
  onRestoreKeyboardMenuFocus,
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
  onRestoreKeyboardMenuFocus?: (itemId: string) => void;
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

  const menuPanelRef = useRef<HTMLDivElement>(null);
  const isActionList = !isConfirmingDelete && !isCreatingGroup;
  const keyboardOpened = sheetMenu.openedVia === 'keyboard';

  useSheetContextMenuListKeyboard({
    menuPanelRef,
    isEnabled: isActionList,
    keyboardOpened,
    onCloseMenus,
    onRestoreKeyboardMenuFocus,
    anchorNavigableId: sheetMenu.anchorNavigableId,
    menuInstanceKey: sheetMenu.worksheet.worksheetId,
  });

  return (
    <ContextMenuLayer menu={sheetMenu} onCloseMenus={onCloseMenus} menuPanelRef={menuPanelRef}>
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
  onDeleteGroupAndSheets,
  deleteGroupRequest,
  onCancelDeleteGroup,
  onConfirmDeleteGroup,
  onSetGroupColor,
  isCreatingGroup,
  onCancelCreatingGroup,
  onConfirmCreatingGroup,
  isDeletingGroupSheets,
  deleteGroupSheetsError,
}: {
  groupMenu: GroupMenuState;
  onCloseMenus: () => void;
  onStartCreatingGroup: (initialWorksheetId?: string) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  onDeleteGroupAndSheets: (groupId: string, groupName: string) => void;
  onSetGroupColor: (groupId: string, colorToken: GroupColorToken) => void;
  deleteGroupRequest: DeleteGroupRequest | null;
  onCancelDeleteGroup: () => void;
  onConfirmDeleteGroup: () => void | Promise<void>;
  isCreatingGroup: boolean;
  onCancelCreatingGroup: () => void;
  onConfirmCreatingGroup: (name: string, colorToken: GroupColorToken) => void;
  isDeletingGroupSheets: boolean;
  deleteGroupSheetsError: string | null;
}) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const actions = buildGroupMenuActions(groupMenu, {
    onStartCreatingGroup,
    onRenameGroup,
    onDeleteGroup,
    onDeleteGroupAndSheets,
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
      ) : isConfirmingGroupDelete && deleteGroupRequest ? (
        <InlineDeleteConfirmation
          message={
            deleteGroupRequest.mode === 'deleteSheets'
              ? `Delete group '${deleteGroupRequest.groupName}' and all ${deleteGroupRequest.sheetCount ?? 0} sheet(s) in it? This cannot be undone.`
              : `Ungroup '${deleteGroupRequest.groupName}'? Sheets become independent.`
          }
          confirmLabel={deleteGroupRequest.mode === 'deleteSheets' ? 'Delete all sheets' : 'Ungroup'}
          cancelLabel="Cancel"
          confirmAriaLabel={
            deleteGroupRequest.mode === 'deleteSheets'
              ? `Confirm delete all sheets in group ${deleteGroupRequest.groupName}`
              : `Confirm ungroup ${deleteGroupRequest.groupName}`
          }
          cancelAriaLabel={
            deleteGroupRequest.mode === 'deleteSheets' ? 'Cancel delete group' : 'Cancel ungroup'
          }
          onConfirm={async () => {
            await onConfirmDeleteGroup();
          }}
          onCancel={onCancelDeleteGroup}
          onCloseMenu={onCloseMenus}
          isDeleting={deleteGroupRequest.mode === 'deleteSheets' ? isDeletingGroupSheets : false}
          error={deleteGroupRequest.mode === 'deleteSheets' ? deleteGroupSheetsError : null}
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
  onRestoreKeyboardMenuFocus,
  onTogglePin,
  onToggleVisibility,
  onRenameWorksheet,
  onRemoveFromGroup,
  onStartCreatingGroup,
  onRenameGroup,
  onDeleteGroup,
  onDeleteGroupAndSheets,
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
  isDeletingGroupSheets = false,
  deleteGroupSheetsError = null,
}: TaskpaneMenusProps) {
  if (!activeMenu) {
    return null;
  }

  if (activeMenu.kind === 'sheet') {
    return (
      <SheetContextMenu
        sheetMenu={activeMenu}
        onCloseMenus={onCloseMenus}
        onRestoreKeyboardMenuFocus={onRestoreKeyboardMenuFocus}
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
      onDeleteGroupAndSheets={onDeleteGroupAndSheets}
      deleteGroupRequest={deleteGroupRequest}
      onCancelDeleteGroup={onCancelDeleteGroup}
      onConfirmDeleteGroup={onConfirmDeleteGroup}
      onSetGroupColor={onSetGroupColor}
      isCreatingGroup={isCreatingGroup}
      onCancelCreatingGroup={onCancelCreatingGroup}
      onConfirmCreatingGroup={onConfirmCreatingGroup}
      isDeletingGroupSheets={isDeletingGroupSheets}
      deleteGroupSheetsError={deleteGroupSheetsError}
    />
  );
}
