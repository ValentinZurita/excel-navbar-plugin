import { useMemo, useState } from 'react';
import { useNavigationController } from '../../application/navigation/useNavigationController';
import { EmptyState } from '../components/EmptyState';
import { GroupSection } from '../components/GroupSection';
import { HiddenSection } from '../components/HiddenSection';
import { SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';
import { Section } from '../components/Section';
import { SheetList } from '../components/SheetList';
import { TaskpaneShell } from '../components/TaskpaneShell';
import type { GroupEntity, WorksheetEntity } from '../../domain/navigation/types';

interface SheetMenuState {
  target: HTMLElement;
  worksheet: WorksheetEntity;
}

interface GroupMenuState {
  target: HTMLElement;
  groupId: string;
  groupName: string;
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

  const menuStyle = sheetMenu?.target
    ? {
        top: sheetMenu.target.getBoundingClientRect().bottom + window.scrollY + 4,
        left: Math.min(sheetMenu.target.getBoundingClientRect().left + window.scrollX, window.innerWidth - 220),
      }
    : groupMenu?.target
      ? {
          top: groupMenu.target.getBoundingClientRect().bottom + window.scrollY + 4,
          left: Math.min(groupMenu.target.getBoundingClientRect().left + window.scrollX, window.innerWidth - 220),
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
            onActivate={controller.activateWorksheet}
            onOpenContextMenu={({ target, worksheet }) => {
              setGroupMenu(null);
              setSheetMenu({ target, worksheet });
            }}
          />
        </Section>
      ) : null}

      <div className="primary-tabs">
        <SheetList
          worksheets={controller.navigatorView.ungrouped}
          activeWorksheetId={controller.state.activeWorksheetId}
          onActivate={controller.activateWorksheet}
          onOpenContextMenu={({ target, worksheet }) => {
            setGroupMenu(null);
            setSheetMenu({ target, worksheet });
          }}
        />
        {!controller.navigatorView.ungrouped.length ? <EmptyState label="No tabs" /> : null}
      </div>

      {controller.navigatorView.groups.length ? (
        <Section title="Groups">
          <GroupSection
            groups={controller.navigatorView.groups}
            activeWorksheetId={controller.state.activeWorksheetId}
            onActivate={controller.activateWorksheet}
            onToggleCollapsed={controller.toggleGroupCollapsed}
            onOpenGroupMenu={({ target, groupId, groupName }) => {
              setSheetMenu(null);
              setGroupMenu({ target, groupId, groupName });
            }}
            onOpenSheetMenu={({ target, worksheet }) => {
              setGroupMenu(null);
              setSheetMenu({ target, worksheet });
            }}
          />
        </Section>
      ) : null}

      <HiddenSection
        isCollapsed={controller.state.hiddenSectionCollapsed}
        worksheets={controller.navigatorView.hidden}
        onToggle={controller.toggleHiddenSection}
        onUnhide={controller.unhideWorksheet}
      />

      {menuStyle && sheetMenu ? (
        <div className="context-menu-layer" onClick={closeMenus}>
          <div className="context-menu" style={menuStyle} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                if (sheetMenu.worksheet.isPinned) {
                  controller.unpinWorksheet(sheetMenu.worksheet.worksheetId);
                } else {
                  controller.pinWorksheet(sheetMenu.worksheet.worksheetId);
                }
                closeMenus();
              }}
            >
              {sheetMenu.worksheet.isPinned ? 'Unpin tab' : 'Pin tab'}
            </button>
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                renameWorksheetFromMenu(sheetMenu.worksheet.worksheetId, sheetMenu.worksheet.name);
                closeMenus();
              }}
            >
              Rename
            </button>
            {availableGroupOptions.map((group: GroupEntity) => (
              <button
                key={group.groupId}
                type="button"
                className="context-menu-item"
                onClick={() => {
                  controller.assignWorksheetToGroup(sheetMenu.worksheet.worksheetId, group.groupId);
                  closeMenus();
                }}
              >
                Move to {group.name}
              </button>
            ))}
            {sheetMenu.worksheet.groupId ? (
              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  controller.removeWorksheetFromGroup(sheetMenu.worksheet.worksheetId);
                  closeMenus();
                }}
              >
                Remove from group
              </button>
            ) : null}
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                createGroupFromMenu();
                closeMenus();
              }}
            >
              New group
            </button>
          </div>
        </div>
      ) : null}

      {menuStyle && groupMenu ? (
        <div className="context-menu-layer" onClick={closeMenus}>
          <div className="context-menu" style={menuStyle} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                renameGroupFromMenu(groupMenu.groupId, groupMenu.groupName);
                closeMenus();
              }}
            >
              Rename group
            </button>
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                if (window.confirm(`Delete ${groupMenu.groupName}? Sheets will become ungrouped.`)) {
                  controller.deleteGroup(groupMenu.groupId);
                }
                closeMenus();
              }}
            >
              Delete group
            </button>
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                createGroupFromMenu();
                closeMenus();
              }}
            >
              New group
            </button>
          </div>
        </div>
      ) : null}
    </TaskpaneShell>
  );
}
