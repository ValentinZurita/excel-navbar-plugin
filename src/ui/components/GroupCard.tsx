import type { NavigatorGroupView } from '../../domain/navigation/types';
import { GroupFolderIcon } from '../icons';
import { SheetList } from './SheetList';
import './GroupCard.css';

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

export function GroupCard({ group, onToggleCollapsed, onOpenGroupMenu, onOpenSheetMenu, ...rest }: GroupCardProps) {
  return (
    <section
      className="group-card"
      // Group menu opens from the card container to include header and child rows.
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
            <GroupFolderIcon className="group-folder-icon" />
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
