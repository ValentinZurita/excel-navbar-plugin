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

  it('shows remove-from-group only for grouped worksheets', () => {
    const { rerender } = render(
      <TaskpaneMenus
        activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet: createWorksheet({ groupId: 'group-1' }) }}
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

    expect(screen.getByRole('button', { name: 'Remove from group' })).toBeInTheDocument();

    rerender(
      <TaskpaneMenus
        activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet: createWorksheet({ groupId: null }) }}
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

    expect(screen.queryByRole('button', { name: 'Remove from group' })).not.toBeInTheDocument();
  });

  it('toggles pin and closes the sheet menu', async () => {
    const user = userEvent.setup();
    const worksheet = createWorksheet();
    const onTogglePin = vi.fn();
    const onCloseMenus = vi.fn();

    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet }}
        onCloseMenus={onCloseMenus}
        onTogglePin={onTogglePin}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Pin tab' }));

    expect(onTogglePin).toHaveBeenCalledWith(worksheet);
    expect(onCloseMenus).toHaveBeenCalled();
  });

  it('renames a worksheet without forcing menu close', async () => {
    const user = userEvent.setup();
    const worksheet = createWorksheet();
    const onRenameWorksheet = vi.fn();
    const onCloseMenus = vi.fn();

    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet }}
        onCloseMenus={onCloseMenus}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={onRenameWorksheet}
        onRemoveFromGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(onRenameWorksheet).toHaveBeenCalledWith(worksheet);
    expect(onCloseMenus).not.toHaveBeenCalled();
  });

  it('deletes a group and closes the group menu', async () => {
    const user = userEvent.setup();
    const onDeleteGroup = vi.fn();
    const onCloseMenus = vi.fn();

    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'group', x: 10, y: 20, groupId: 'group-1', groupName: 'Finance' }}
        onCloseMenus={onCloseMenus}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onCreateGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={onDeleteGroup}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete group' }));

    expect(onDeleteGroup).toHaveBeenCalledWith('group-1', 'Finance');
    expect(onCloseMenus).toHaveBeenCalled();
  });

  it('starts a new group from a worksheet menu with the worksheet id', async () => {
    const user = userEvent.setup();
    const onCreateGroup = vi.fn();

    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet: createWorksheet() }}
        onCloseMenus={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onCreateGroup={onCreateGroup}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'New group' }));

    expect(onCreateGroup).toHaveBeenCalledWith('sheet-1');
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
