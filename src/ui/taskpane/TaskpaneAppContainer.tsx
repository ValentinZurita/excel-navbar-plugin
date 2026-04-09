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
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="currentColor">
      <path d="M10.0589 2.44535C9.34701 1.73087 8.14697 1.90854 7.67261 2.79864L5.6526 6.58902L2.8419 7.52592C2.6775 7.58072 2.5532 7.71673 2.51339 7.88539C2.47357 8.05404 2.52392 8.23128 2.64646 8.35382L4.79291 10.5003L2.14645 13.1467L2 14.0003L2.85356 13.8538L5.50002 11.2074L7.64646 13.3538C7.76899 13.4764 7.94623 13.5267 8.11489 13.4869C8.28354 13.4471 8.41955 13.3228 8.47435 13.1584L9.41143 10.3472L13.1897 8.32448C14.0759 7.85006 14.2538 6.65535 13.5443 5.9433L10.0589 2.44535ZM8.55511 3.26895C8.71323 2.97225 9.11324 2.91303 9.35055 3.15119L12.836 6.64914C13.0725 6.88648 13.0131 7.28472 12.7178 7.44286L8.76403 9.55946C8.65137 9.61977 8.56608 9.72092 8.52567 9.84215L7.7815 12.0746L3.92562 8.21877L6.15812 7.47461C6.27966 7.43409 6.38101 7.34848 6.44126 7.23542L8.55511 3.26895Z" />
    </svg>
  );
}

function PinOffMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="currentColor">
      <path d="M9.56016 10.2673L14.1464 14.8536C14.3417 15.0488 14.6583 15.0488 14.8536 14.8536C15.0488 14.6583 15.0488 14.3417 14.8536 14.1464L1.85355 1.14645C1.65829 0.951184 1.34171 0.951184 1.14645 1.14645C0.951184 1.34171 0.951184 1.65829 1.14645 1.85355L5.73223 6.43934L5.6526 6.58876L2.8419 7.52566C2.6775 7.58046 2.5532 7.71648 2.51339 7.88513C2.47357 8.05378 2.52392 8.23102 2.64646 8.35356L4.79291 10.5L2.14645 13.1465L2 14L2.85356 13.8536L5.50002 11.2071L7.64646 13.3536C7.76899 13.4761 7.94623 13.5264 8.11489 13.4866C8.28354 13.4468 8.41955 13.3225 8.47435 13.1581L9.41143 10.3469L9.56016 10.2673ZM8.82138 9.52849L8.76403 9.5592C8.65137 9.61951 8.56608 9.72066 8.52567 9.84189L7.7815 12.0744L3.92562 8.21851L6.15812 7.47435C6.27966 7.43383 6.38101 7.34822 6.44126 7.23516L6.47143 7.17854L8.82138 9.52849ZM12.7178 7.4426L10.6636 8.54227L11.4024 9.28105L13.1897 8.32422C14.0759 7.84981 14.2538 6.65509 13.5443 5.94304L10.0589 2.44509C9.34701 1.73062 8.14697 1.90828 7.67261 2.79838L6.71556 4.59421L7.45476 5.33341L8.55511 3.26869C8.71323 2.97199 9.11324 2.91277 9.35055 3.15093L12.836 6.64888C13.0725 6.88623 13.0131 7.28446 12.7178 7.4426Z" />
    </svg>
  );
}

function RenameMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="currentColor">
      <path d="M14.236 1.76406C13.2123 0.74037 11.5525 0.740369 10.5289 1.76406L2.65722 9.63568C2.28304 10.0099 2.01623 10.4777 1.88467 10.9902L1.01571 14.3757C0.971767 14.5469 1.02148 14.7286 1.14646 14.8536C1.27144 14.9785 1.45312 15.0282 1.62432 14.9843L5.00978 14.1153C5.52234 13.9838 5.99015 13.717 6.36433 13.3428L14.236 5.47117C15.2596 4.44748 15.2596 2.78775 14.236 1.76406ZM11.236 2.47117C11.8691 1.838 12.8957 1.838 13.5288 2.47117C14.162 3.10433 14.162 4.13089 13.5288 4.76406L12.75 5.54288L10.4571 3.24999L11.236 2.47117ZM9.75002 3.9571L12.0429 6.24999L5.65722 12.6357C5.40969 12.8832 5.10023 13.0597 4.76117 13.1467L2.19447 13.8055L2.85327 11.2388C2.9403 10.8998 3.1168 10.5903 3.36433 10.3428L9.75002 3.9571Z" />
    </svg>
  );
}

function MoveMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="currentColor">
      <path d="M2.5 7.50001C2.22386 7.50001 2 7.72386 2 8.00001C2 8.27615 2.22386 8.50001 2.5 8.50001L12.197 8.5L8.16552 12.1284C7.96026 12.3131 7.94362 12.6292 8.12835 12.8345C8.31308 13.0397 8.62923 13.0564 8.83448 12.8717L13.8345 8.37165C13.9398 8.27683 14 8.14175 14 8C14 7.85826 13.9398 7.72318 13.8345 7.62836L8.83448 3.12836C8.62923 2.94363 8.31308 2.96027 8.12835 3.16552C7.94362 3.37078 7.96026 3.68692 8.16552 3.87165L12.197 7.5L2.5 7.50001Z" />
    </svg>
  );
}

function RemoveMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="currentColor">
      <path d="M2.58859 2.71569L2.64645 2.64645C2.82001 2.47288 3.08944 2.4536 3.28431 2.58859L3.35355 2.64645L8 7.293L12.6464 2.64645C12.8417 2.45118 13.1583 2.45118 13.3536 2.64645C13.5488 2.84171 13.5488 3.15829 13.3536 3.35355L8.707 8L13.3536 12.6464C13.5271 12.82 13.5464 13.0894 13.4114 13.2843L13.3536 13.3536C13.18 13.5271 12.9106 13.5464 12.7157 13.4114L12.6464 13.3536L8 8.707L3.35355 13.3536C3.15829 13.5488 2.84171 13.5488 2.64645 13.3536C2.45118 13.1583 2.45118 12.8417 2.64645 12.6464L7.293 8L2.64645 3.35355C2.47288 3.17999 2.4536 2.91056 2.58859 2.71569L2.64645 2.64645L2.58859 2.71569Z" />
    </svg>
  );
}

function AddGroupMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="currentColor">
      <path d="M2 4.5V6H5.58579C5.71839 6 5.84557 5.94732 5.93934 5.85355L7.29289 4.5L5.93934 3.14645C5.84557 3.05268 5.71839 3 5.58579 3H3.5C2.67157 3 2 3.67157 2 4.5ZM1 4.5C1 3.11929 2.11929 2 3.5 2H5.58579C5.98361 2 6.36514 2.15804 6.64645 2.43934L8.20711 4H12.5C13.8807 4 15 5.11929 15 6.5V7.25716C14.6929 7.00353 14.3578 6.78261 14 6.59971V6.5C14 5.67157 13.3284 5 12.5 5H8.20711L6.64645 6.56066C6.36514 6.84197 5.98361 7 5.58579 7H2V11.5C2 12.3284 2.67157 13 3.5 13H6.20703C6.30564 13.3486 6.43777 13.6832 6.59971 14H3.5C2.11929 14 1 12.8807 1 11.5V4.5ZM16 11.5C16 13.9853 13.9853 16 11.5 16C9.01472 16 7 13.9853 7 11.5C7 9.01472 9.01472 7 11.5 7C13.9853 7 16 9.01472 16 11.5ZM12 9.5C12 9.22386 11.7761 9 11.5 9C11.2239 9 11 9.22386 11 9.5V11H9.5C9.22386 11 9 11.2239 9 11.5C9 11.7761 9.22386 12 9.5 12H11V13.5C11 13.7761 11.2239 14 11.5 14C11.7761 14 12 13.7761 12 13.5V12H13.5C13.7761 12 14 11.7761 14 11.5C14 11.2239 13.7761 11 13.5 11H12V9.5Z" />
    </svg>
  );
}

function DeleteMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="currentColor">
      <path d="M7 3H9C9 2.44772 8.55228 2 8 2C7.44772 2 7 2.44772 7 3ZM6 3C6 1.89543 6.89543 1 8 1C9.10457 1 10 1.89543 10 3H14C14.2761 3 14.5 3.22386 14.5 3.5C14.5 3.77614 14.2761 4 14 4H13.4364L12.2313 12.8378C12.0624 14.0765 11.0044 15 9.75422 15H6.24578C4.99561 15 3.93762 14.0765 3.76871 12.8378L2.56355 4H2C1.72386 4 1.5 3.77614 1.5 3.5C1.5 3.22386 1.72386 3 2 3H6ZM7 6.5C7 6.22386 6.77614 6 6.5 6C6.22386 6 6 6.22386 6 6.5V11.5C6 11.7761 6.22386 12 6.5 12C6.77614 12 7 11.7761 7 11.5V6.5ZM9.5 6C9.77614 6 10 6.22386 10 6.5V11.5C10 11.7761 9.77614 12 9.5 12C9.22386 12 9 11.7761 9 11.5V6.5C9 6.22386 9.22386 6 9.5 6ZM4.75954 12.7027C4.86089 13.4459 5.49568 14 6.24578 14H9.75422C10.5043 14 11.1391 13.4459 11.2405 12.7027L12.4272 4H3.57281L4.75954 12.7027Z" />
    </svg>
  );
}

function EyeMenuIcon() {
  return (
    <svg viewBox="0 0 16 16" className="context-menu-icon-svg" fill="currentColor">
      <path d="M2.98444 8.62471L2.98346 8.62815C2.91251 8.8948 2.63879 9.05404 2.37202 8.9833C1.94098 8.86907 2.01687 8.37186 2.01687 8.37186L2.03453 8.31047C2.03453 8.31047 2.06063 8.22636 2.08166 8.1653C2.12369 8.04329 2.18795 7.87274 2.27931 7.66977C2.46154 7.26493 2.75443 6.72477 3.19877 6.18295C4.09629 5.08851 5.60509 4 8.00017 4C10.3952 4 11.904 5.08851 12.8016 6.18295C13.2459 6.72477 13.5388 7.26493 13.721 7.66977C13.8124 7.87274 13.8766 8.04329 13.9187 8.1653C13.9397 8.22636 13.9552 8.27541 13.9658 8.31047C13.9711 8.328 13.9752 8.34204 13.9781 8.35236L13.9816 8.365L13.9827 8.36916L13.9832 8.37069L13.9835 8.37186C14.0542 8.63878 13.8952 8.91253 13.6283 8.9833C13.3618 9.05397 13.0885 8.89556 13.0172 8.62937L13.0169 8.62815L13.0159 8.62471L13.0085 8.5997C13.0014 8.57616 12.9898 8.53927 12.9732 8.49095C12.9399 8.39422 12.8866 8.25227 12.8091 8.08023C12.6538 7.73508 12.4041 7.27523 12.0283 6.81706C11.2857 5.9115 10.0445 5 8.00017 5C5.95584 5 4.71464 5.9115 3.97201 6.81706C3.59627 7.27523 3.34655 7.73508 3.19119 8.08023C3.11375 8.25227 3.06047 8.39422 3.02715 8.49095C3.01051 8.53927 2.9989 8.57616 2.99179 8.5997L2.98444 8.62471ZM8.00024 7C6.61953 7 5.50024 8.11929 5.50024 9.5C5.50024 10.8807 6.61953 12 8.00024 12C9.38096 12 10.5002 10.8807 10.5002 9.5C10.5002 8.11929 9.38096 7 8.00024 7ZM6.50024 9.5C6.50024 8.67157 7.17182 8 8.00024 8C8.82867 8 9.50024 8.67157 9.50024 9.5C9.50024 10.3284 8.82867 11 8.00024 11C7.17182 11 6.50024 10.3284 6.50024 9.5Z" />
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
              icon={sheetMenu.worksheet.isPinned ? <PinOffMenuIcon /> : <PinMenuIcon />}
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
                icon={<MoveMenuIcon />}
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
              icon={<AddGroupMenuIcon />}
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
              icon={<DeleteMenuIcon />}
              label="Delete group"
              onClick={() => {
                if (window.confirm(`Delete ${groupMenu.groupName}? Sheets will become ungrouped.`)) {
                  controller.deleteGroup(groupMenu.groupId);
                }
                closeMenus();
              }}
            />
            <MenuItem
              icon={<AddGroupMenuIcon />}
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
