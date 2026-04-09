import type { NavigatorGroupView } from '../../domain/navigation/types';
import { SheetList } from './SheetList';

interface GroupCardProps {
  group: NavigatorGroupView;
  activeWorksheetId: string | null;
  contextMenuOpenId?: string;
  groupMenuOpenId?: string;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string) => void;
  onOpenGroupMenu: (args: { target: HTMLElement; x: number; y: number; groupId: string; groupName: string }) => void;
  onOpenSheetMenu: (args: { target: HTMLElement; x: number; y: number; worksheet: NavigatorGroupView['worksheets'][number] }) => void;
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="group-folder-icon">
      <path
        d="M2.5 4.2C2.5 3.5 3 3 3.7 3H6.4L7.4 4H12.3C13 4 13.5 4.5 13.5 5.2V11.3C13.5 12 13 12.5 12.3 12.5H3.7C3 12.5 2.5 12 2.5 11.3V4.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function GroupCard({ group, onToggleCollapsed, onOpenGroupMenu, onOpenSheetMenu, ...rest }: GroupCardProps) {
  return (
    <section
      className="group-card"
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenGroupMenu({
          target: event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          groupId: group.groupId,
          groupName: group.name,
        });
      }}
    >
      <header className={`group-header ${group.groupId === rest.groupMenuOpenId ? 'group-header-context-open' : ''}`}>
        <button className="group-toggle" type="button" onClick={() => onToggleCollapsed(group.groupId)}>
          <span className="group-leading" aria-hidden="true">
            <FolderIcon />
          </span>
          <span className="group-copy">
            <span className="group-title">{group.name}</span>
            <small>{group.worksheets.length} sheet{group.worksheets.length === 1 ? '' : 's'}</small>
          </span>
        </button>
      </header>

      {!group.isCollapsed ? (
        <SheetList
          worksheets={group.worksheets}
          activeWorksheetId={rest.activeWorksheetId}
          contextMenuOpenId={rest.contextMenuOpenId}
          onActivate={rest.onActivate}
          onOpenContextMenu={onOpenSheetMenu}
        />
      ) : null}
    </section>
  );
}
