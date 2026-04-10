import { useMemo, useState, type ReactNode } from 'react';
import { useNavigationController } from '../../application/navigation/useNavigationController';
import { GroupSection } from '../components/GroupSection';
import { HiddenSection } from '../components/HiddenSection';
import { SearchBox } from '../components/SearchBox';
import { Section } from '../components/Section';
import { SheetList } from '../components/SheetList';
import { TaskpaneShell } from '../components/TaskpaneShell';
import { TextPromptDialog } from '../components/TextPromptDialog';
import type { GroupEntity, WorksheetEntity } from '../../domain/navigation/types';
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
} from '../icons';

interface SheetMenuState {
  x: number;
  y: number;
  worksheet: WorksheetEntity;
}

interface GroupMenuState {
  x: number;
  y: number;
  groupId: string;
  groupName: string;
}

type TextPromptState =
  | { kind: 'create-group'; initialValue: string }
  | { kind: 'rename-sheet'; worksheetId: string; initialValue: string }
  | { kind: 'rename-group'; groupId: string; initialValue: string };

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className="context-menu-item" onClick={onClick}>
      <span className="context-menu-icon" aria-hidden="true">{icon}</span>
      <span className="context-menu-label">{label}</span>
    </button>
  );
}

export function TaskpaneAppContainer() {
  const controller = useNavigationController();
  const [sheetMenu, setSheetMenu] = useState<SheetMenuState | null>(null);
  const [groupMenu, setGroupMenu] = useState<GroupMenuState | null>(null);
  const [textPrompt, setTextPrompt] = useState<TextPromptState | null>(null);

  const availableGroupOptions = useMemo(
    () =>
      controller.state.groupOrder
        .map((groupId) => controller.state.groupsById[groupId])
        .filter((group): group is NonNullable<typeof group> => Boolean(group)),
    [controller.state.groupOrder, controller.state.groupsById],
  );

  const menuStyle = sheetMenu
    ? {
        top: Math.min(sheetMenu.y + 6, window.innerHeight - 220),
        left: Math.min(sheetMenu.x + 6, window.innerWidth - 260),
      }
    : groupMenu
      ? {
          top: Math.min(groupMenu.y + 6, window.innerHeight - 220),
          left: Math.min(groupMenu.x + 6, window.innerWidth - 260),
        }
      : undefined;

  function closeMenus() {
    setSheetMenu(null);
    setGroupMenu(null);
  }

  function closeTextPrompt() {
    setTextPrompt(null);
  }

  function openCreateGroupPrompt() {
    closeMenus();
    setTextPrompt({ kind: 'create-group', initialValue: '' });
  }

  async function activateWorksheetFromSearch(worksheetId: string) {
    await controller.activateWorksheet(worksheetId);
    controller.setQuery('');
  }

  function openRenameWorksheetPrompt(worksheetId: string, currentName: string) {
    closeMenus();
    setTextPrompt({ kind: 'rename-sheet', worksheetId, initialValue: currentName });
  }

  function openRenameGroupPrompt(groupId: string, currentName: string) {
    closeMenus();
    setTextPrompt({ kind: 'rename-group', groupId, initialValue: currentName });
  }

  async function submitTextPrompt(nextValue: string) {
    if (!textPrompt) {
      return;
    }

    const value = nextValue.trim();
    if (!value) {
      return;
    }

    const promptState = textPrompt;
    setTextPrompt(null);

    if (promptState.kind === 'create-group') {
      controller.createGroup(value);
      return;
    }

    if (promptState.kind === 'rename-group') {
      controller.renameGroup(promptState.groupId, value);
      return;
    }

    await controller.renameWorksheet(promptState.worksheetId, value);
  }

  const textPromptConfig = textPrompt
    ? textPrompt.kind === 'create-group'
      ? {
          title: 'New group',
          description: 'Create a manual group for related sheets.',
          placeholder: 'Finance',
          submitLabel: 'Create group',
        }
      : textPrompt.kind === 'rename-sheet'
        ? {
            title: 'Rename sheet',
            description: 'Choose a clear worksheet name.',
            placeholder: 'Revenue',
            submitLabel: 'Save name',
          }
        : {
            title: 'Rename group',
            description: 'Keep the group label short and scannable.',
            placeholder: 'Operations',
            submitLabel: 'Save name',
          }
    : null;

  return (
    <TaskpaneShell errorMessage={controller.errorMessage}>
      <SearchBox
        value={controller.state.query}
        onChange={controller.setQuery}
        results={controller.navigatorView.searchResults}
        onSelect={activateWorksheetFromSearch}
      />

      {controller.navigatorView.pinned.length ? (
        <Section title="Pinned">
          <SheetList
            worksheets={controller.navigatorView.pinned}
            activeWorksheetId={controller.state.activeWorksheetId}
            contextMenuOpenId={sheetMenu?.worksheet?.worksheetId}
            onActivate={controller.activateWorksheet}
            onTogglePin={(worksheetId) => controller.unpinWorksheet(worksheetId)}
            onOpenContextMenu={({ target, worksheet, x, y }) => {
              setGroupMenu(null);
              if (sheetMenu?.worksheet?.worksheetId === worksheet.worksheetId) {
                setSheetMenu(null);
              } else {
                setSheetMenu({ x, y, worksheet });
              }
            }}
          />
        </Section>
      ) : null}

      {controller.navigatorView.ungrouped.length ? (
        <Section title="Sheets">
          <div className="primary-tabs">
            <SheetList
              worksheets={controller.navigatorView.ungrouped}
              activeWorksheetId={controller.state.activeWorksheetId}
              contextMenuOpenId={sheetMenu?.worksheet?.worksheetId}
              onActivate={controller.activateWorksheet}
              onTogglePin={(worksheetId) => controller.pinWorksheet(worksheetId)}
              onOpenContextMenu={({ target, worksheet, x, y }) => {
                setGroupMenu(null);
                if (sheetMenu?.worksheet?.worksheetId === worksheet.worksheetId) {
                  setSheetMenu(null);
                } else {
                  setSheetMenu({ x, y, worksheet });
                }
              }}
            />
          </div>
        </Section>
      ) : null}

      {controller.navigatorView.groups.length ? (
        <Section title="Groups">
          <GroupSection
            groups={controller.navigatorView.groups}
            activeWorksheetId={controller.state.activeWorksheetId}
            contextMenuOpenId={sheetMenu?.worksheet?.worksheetId}
            groupMenuOpenId={groupMenu?.groupId}
            onActivate={controller.activateWorksheet}
            onToggleCollapsed={controller.toggleGroupCollapsed}
            onOpenGroupMenu={({ target, groupId, groupName, x, y }) => {
              setSheetMenu(null);
              setGroupMenu({ x, y, groupId, groupName });
            }}
            onOpenSheetMenu={({ target, worksheet, x, y }) => {
              setGroupMenu(null);
              if (sheetMenu?.worksheet?.worksheetId === worksheet.worksheetId) {
                setSheetMenu(null);
              } else {
                setSheetMenu({ x, y, worksheet });
              }
            }}
          />
        </Section>
      ) : null}

      {controller.navigatorView.hidden.length ? (
        <HiddenSection
          isCollapsed={controller.state.hiddenSectionCollapsed}
          worksheets={controller.navigatorView.hidden}
          onToggle={controller.toggleHiddenSection}
          onUnhide={controller.unhideWorksheet}
          onOpenContextMenu={({ target, worksheet, x, y }) => {
            setGroupMenu(null);
            if (sheetMenu?.worksheet?.worksheetId === worksheet.worksheetId) {
              setSheetMenu(null);
            } else {
              setSheetMenu({ x, y, worksheet });
            }
          }}
        />
      ) : null}

      {menuStyle && sheetMenu ? (
        <div className="context-menu-layer" onClick={closeMenus} onContextMenu={(event) => { event.preventDefault(); closeMenus(); }}>
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
                if (sheetMenu.worksheet.isPinned) {
                  controller.unpinWorksheet(sheetMenu.worksheet.worksheetId);
                } else {
                  controller.pinWorksheet(sheetMenu.worksheet.worksheetId);
                }
                closeMenus();
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
                if (sheetMenu.worksheet.visibility === 'Visible') {
                  controller.hideWorksheet(sheetMenu.worksheet.worksheetId);
                } else {
                  controller.unhideWorksheet(sheetMenu.worksheet.worksheetId);
                }
                closeMenus();
              }}
            />
            <MenuItem
              icon={<RenameMenuIcon className="context-menu-icon-svg" />}
              label="Rename"
              onClick={() => {
                openRenameWorksheetPrompt(sheetMenu.worksheet.worksheetId, sheetMenu.worksheet.name);
              }}
            />
            {availableGroupOptions.map((group: GroupEntity) => (
              <MenuItem
                key={group.groupId}
                icon={<MoveMenuIcon className="context-menu-icon-svg" />}
                label={`Move to ${group.name}`}
                onClick={() => {
                  controller.assignWorksheetToGroup(sheetMenu.worksheet.worksheetId, group.groupId);
                  closeMenus();
                }}
              />
            ))}
            {sheetMenu.worksheet.groupId ? (
              <MenuItem
                icon={<RemoveMenuIcon className="context-menu-icon-svg" />}
                label="Remove from group"
                onClick={() => {
                  controller.removeWorksheetFromGroup(sheetMenu.worksheet.worksheetId);
                  closeMenus();
                }}
              />
            ) : null}
            <MenuItem
              icon={<AddGroupMenuIcon className="context-menu-icon-svg" />}
              label="New group"
              onClick={() => {
                openCreateGroupPrompt();
              }}
            />
          </div>
        </div>
      ) : null}

      {menuStyle && groupMenu ? (
        <div className="context-menu-layer" onClick={closeMenus}>
          <div className="context-menu" style={menuStyle} onClick={(event) => event.stopPropagation()}>
            <MenuItem
              icon={<RenameMenuIcon className="context-menu-icon-svg" />}
              label="Rename group"
              onClick={() => {
                openRenameGroupPrompt(groupMenu.groupId, groupMenu.groupName);
              }}
            />
            <MenuItem
              icon={<DeleteMenuIcon className="context-menu-icon-svg" />}
              label="Delete group"
              onClick={() => {
                if (window.confirm(`Delete ${groupMenu.groupName}? Sheets will become ungrouped.`)) {
                  controller.deleteGroup(groupMenu.groupId);
                }
                closeMenus();
              }}
            />
            <MenuItem
              icon={<AddGroupMenuIcon className="context-menu-icon-svg" />}
              label="New group"
              onClick={() => {
                openCreateGroupPrompt();
              }}
            />
          </div>
        </div>
      ) : null}

      <TextPromptDialog
        isOpen={Boolean(textPrompt && textPromptConfig)}
        title={textPromptConfig?.title ?? ''}
        description={textPromptConfig?.description}
        initialValue={textPrompt?.initialValue ?? ''}
        placeholder={textPromptConfig?.placeholder}
        submitLabel={textPromptConfig?.submitLabel ?? 'Save'}
        onCancel={closeTextPrompt}
        onSubmit={submitTextPrompt}
      />
    </TaskpaneShell>
  );
}
