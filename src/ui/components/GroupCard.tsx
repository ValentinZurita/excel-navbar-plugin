import { useState } from 'react';
import type { GroupEntity, NavigatorGroupView } from '../../domain/navigation/types';
import { SheetList } from './SheetList';

interface GroupCardProps {
  group: NavigatorGroupView;
  activeWorksheetId: string | null;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onToggleCollapsed: (groupId: string) => void;
  onOpenGroupMenu: (args: { target: HTMLElement; groupId: string; groupName: string }) => void;
  onOpenSheetMenu: (args: { target: HTMLElement; worksheet: NavigatorGroupView['worksheets'][number] }) => void;
}

export function GroupCard({ group, onToggleCollapsed, onOpenGroupMenu, onOpenSheetMenu, ...rest }: GroupCardProps) {
  return (
    <section
      className="group-card"
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenGroupMenu({
          target: event.currentTarget,
          groupId: group.groupId,
          groupName: group.name,
        });
      }}
    >
      <header className="group-header">
        <button className="group-toggle" type="button" onClick={() => onToggleCollapsed(group.groupId)}>
          <span className="group-title">{group.name}</span>
          <small>{group.worksheets.length} sheet{group.worksheets.length === 1 ? '' : 's'}</small>
        </button>
      </header>

      {!group.isCollapsed ? (
        <SheetList
          worksheets={group.worksheets}
          activeWorksheetId={rest.activeWorksheetId}
          onActivate={rest.onActivate}
          onOpenContextMenu={onOpenSheetMenu}
        />
      ) : null}
    </section>
  );
}
