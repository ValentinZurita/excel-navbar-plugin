import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { TaskpaneMenus } from '../../src/ui/taskpane/components/TaskpaneMenus';

function createWorksheet(overrides: Partial<WorksheetEntity> = {}): WorksheetEntity {
  return {
    worksheetId: 'sheet-1',
    name: 'Revenue',
    visibility: 'Visible',
    workbookOrder: 1,
    isPinned: false,
    groupId: null,
    lastKnownStructuralState: null,
    ...overrides,
  };
}

describe('TaskpaneMenus', () => {
  it('renders sheet actions from the active menu kind', () => {
    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet: createWorksheet() }}
        onCloseMenus={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Pin tab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide sheet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('renders group actions from the active menu kind', () => {
    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'group', x: 10, y: 20, groupId: 'group-1', groupName: 'Finance' }}
        onCloseMenus={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Rename group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete group' })).toBeInTheDocument();
  });

  it('closes the menu when clicking the overlay', async () => {
    const user = userEvent.setup();
    const onCloseMenus = vi.fn();

    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet: createWorksheet() }}
        onCloseMenus={onCloseMenus}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />,
    );

    await user.click(document.querySelector('.context-menu-layer') as HTMLElement);

    expect(onCloseMenus).toHaveBeenCalled();
  });
});
