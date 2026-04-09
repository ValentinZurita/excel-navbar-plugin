import { useMemo, useState, type ReactNode } from 'react';
import { useNavigationController } from '../../application/navigation/useNavigationController';
import { GroupSection } from '../components/GroupSection';
import { HiddenSection } from '../components/HiddenSection';
import { SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';
import { Section } from '../components/Section';
import { SheetList } from '../components/SheetList';
import { TaskpaneShell } from '../components/TaskpaneShell';
import type { GroupEntity, WorksheetEntity } from '../../domain/navigation/types';

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

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className="context-menu-item" onClick={onClick}>
      <span className="context-menu-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="context-menu-label">{label}</span>
    </button>
  );
}

function PinMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="none" stroke="currentColor">
      <path d="M8 10V14" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6.1 3.2H9.9C10.3 3.2 10.7 3.5 10.7 4V4.8L11.9 5.9C12.1 6.1 12.2 6.3 12.2 6.6C12.2 7 11.8 7.4 11.4 7.4H8.7V10L7.3 12.7L6.7 12.5L7 10V7.4H4.6C4.2 7.4 3.8 7 3.8 6.6C3.8 6.3 3.9 6.1 4.1 5.9L5.3 4.8V4C5.3 3.5 5.7 3.2 6.1 3.2Z" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function RenameMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="none" stroke="currentColor">
      <path d="M3 11.8L4.1 8.9L10.8 2.2C11.3 1.7 12 1.7 12.5 2.2L13.8 3.5C14.3 4 14.3 4.7 13.8 5.2L7.1 11.9L4.2 13L3 11.8Z" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9.8 3.2L12.8 6.2" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function GroupMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="none" stroke="currentColor">
      <path d="M2.5 4.2C2.5 3.5 3 3 3.7 3H6.4L7.4 4H12.3C13 4 13.5 4.5 13.5 5.2V11.3C13.5 12 13 12.5 12.3 12.5H3.7C3 12.5 2.5 12 2.5 11.3V4.2Z" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function RemoveMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="none" stroke="currentColor">
      <path d="M3.5 4.5H12.5" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6.2 2.8H9.8" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 4.5V12C5 12.6 5.4 13 6 13H10C10.6 13 11 12.6 11 12V4.5" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function TaskpaneAppContainer() {
  const controller = useNavigationController();
  const [sheetMenu, setSheetMenu] = useState<SheetMenuState | null>(null);
  const [groupMenu, setGroupMenu] = useState<GroupMenuState | null>(null);

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

  function createGroupFromMenu() {
    const name = window.prompt('Group name');
    if (!name?.trim()) {
      return;
    }
    controller.createGroup(name.trim());
  }

  function renameWorksheetFromMenu(worksheetId: string, currentName: string) {
    const nextName = window.prompt('Rename sheet', currentName);
    if (!nextName?.trim()) {
      return;
    }
    void controller.renameWorksheet(worksheetId, nextName.trim());
  }

  function renameGroupFromMenu(groupId: string, currentName: string) {
    const nextName = window.prompt('Rename group', currentName);
    if (!nextName?.trim()) {
      return;
    }
    controller.renameGroup(groupId, nextName.trim());
  }

  return (
    <TaskpaneShell errorMessage={controller.errorMessage}>
      <SearchBar value={controller.state.query} onChange={controller.setQuery} />
      {controller.state.query ? (
        <SearchResults results={controller.navigatorView.searchResults} onSelect={controller.activateWorksheet} />
      ) : null}

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
              setSheetMenu({ x, y, worksheet });
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
                setSheetMenu({ x, y, worksheet });
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
              setSheetMenu({ x, y, worksheet });
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
        />
      ) : null}

      {menuStyle && sheetMenu ? (
        <div className="context-menu-layer" onClick={closeMenus}>
          <div className="context-menu" style={menuStyle} onClick={(event) => event.stopPropagation()}>
            <MenuItem
              icon={<PinMenuIcon />}
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
              icon={<RenameMenuIcon />}
              label="Rename"
              onClick={() => {
                renameWorksheetFromMenu(sheetMenu.worksheet.worksheetId, sheetMenu.worksheet.name);
                closeMenus();
              }}
            />
            {availableGroupOptions.map((group: GroupEntity) => (
              <MenuItem
                key={group.groupId}
                icon={<GroupMenuIcon />}
                label={`Move to ${group.name}`}
                onClick={() => {
                  controller.assignWorksheetToGroup(sheetMenu.worksheet.worksheetId, group.groupId);
                  closeMenus();
                }}
              />
            ))}
            {sheetMenu.worksheet.groupId ? (
              <MenuItem
                icon={<RemoveMenuIcon />}
                label="Remove from group"
                onClick={() => {
                  controller.removeWorksheetFromGroup(sheetMenu.worksheet.worksheetId);
                  closeMenus();
                }}
              />
            ) : null}
            <MenuItem
              icon={<GroupMenuIcon />}
              label="New group"
              onClick={() => {
                createGroupFromMenu();
                closeMenus();
              }}
            />
          </div>
        </div>
      ) : null}

      {menuStyle && groupMenu ? (
        <div className="context-menu-layer" onClick={closeMenus}>
          <div className="context-menu" style={menuStyle} onClick={(event) => event.stopPropagation()}>
            <MenuItem
              icon={<RenameMenuIcon />}
              label="Rename group"
              onClick={() => {
                renameGroupFromMenu(groupMenu.groupId, groupMenu.groupName);
                closeMenus();
              }}
            />
            <MenuItem
              icon={<RemoveMenuIcon />}
              label="Delete group"
              onClick={() => {
                if (window.confirm(`Delete ${groupMenu.groupName}? Sheets will become ungrouped.`)) {
                  controller.deleteGroup(groupMenu.groupId);
                }
                closeMenus();
              }}
            />
            <MenuItem
              icon={<GroupMenuIcon />}
              label="New group"
              onClick={() => {
                createGroupFromMenu();
                closeMenus();
              }}
            />
          </div>
        </div>
      ) : null}
    </TaskpaneShell>
  );
}
