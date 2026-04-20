import { render, screen, waitFor } from '@testing-library/react';
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

function renderSheetMenu(overrides: Partial<React.ComponentProps<typeof TaskpaneMenus>> = {}) {
  return render(
    <TaskpaneMenus
      activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet: createWorksheet() }}
      onCloseMenus={vi.fn()}
      onTogglePin={vi.fn()}
      onToggleVisibility={vi.fn()}
      onRenameWorksheet={vi.fn()}
      onRemoveFromGroup={vi.fn()}
      onStartCreatingGroup={vi.fn()}
      onRenameGroup={vi.fn()}
      onDeleteGroup={vi.fn()}
      deleteGroupRequest={null}
      onCancelDeleteGroup={vi.fn()}
      onConfirmDeleteGroup={vi.fn()}
      onSetGroupColor={vi.fn()}
      isCreatingGroup={false}
      onCancelCreatingGroup={vi.fn()}
      onConfirmCreatingGroup={vi.fn()}
      isConfirmingDelete={false}
      worksheetToDelete={null}
      onStartDeleteConfirmation={vi.fn()}
      onCancelDeleteConfirmation={vi.fn()}
      onConfirmDelete={vi.fn()}
      isDeleting={false}
      deleteError={null}
      {...overrides}
    />,
  );
}

describe('TaskpaneMenus', () => {
  it('renders sheet actions from the active menu kind', () => {
    renderSheetMenu();

    expect(screen.getByRole('button', { name: 'Pin sheet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide sheet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('focuses the first sheet menu action when opened via keyboard', async () => {
    renderSheetMenu({
      activeMenu: {
        kind: 'sheet',
        x: 10,
        y: 20,
        worksheet: createWorksheet(),
        openedVia: 'keyboard',
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pin sheet' })).toHaveFocus();
    });
  });

  it('closes the sheet menu when ArrowLeft is pressed from a keyboard-opened menu', async () => {
    const user = userEvent.setup();
    const onCloseMenus = vi.fn();
    renderSheetMenu({
      onCloseMenus,
      activeMenu: {
        kind: 'sheet',
        x: 10,
        y: 20,
        worksheet: createWorksheet(),
        openedVia: 'keyboard',
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pin sheet' })).toHaveFocus();
    });

    await user.keyboard('{ArrowLeft}');
    expect(onCloseMenus).toHaveBeenCalledTimes(1);
  });

  it('renders group actions from the active menu kind', () => {
    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'group', x: 10, y: 20, groupId: 'group-1', groupName: 'Finance', colorToken: 'blue' }}
        onCloseMenus={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onStartCreatingGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
        deleteGroupRequest={null}
        onCancelDeleteGroup={vi.fn()}
        onConfirmDeleteGroup={vi.fn()}
        onSetGroupColor={vi.fn()}
        isCreatingGroup={false}
        onCancelCreatingGroup={vi.fn()}
        onConfirmCreatingGroup={vi.fn()}
        isConfirmingDelete={false}
        worksheetToDelete={null}
        onStartDeleteConfirmation={vi.fn()}
        onCancelDeleteConfirmation={vi.fn()}
        onConfirmDelete={vi.fn().mockResolvedValue(undefined)}
        isDeleting={false}
        deleteError={null}
      />,
    );

    expect(screen.getByRole('button', { name: 'Rename group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ungroup' })).toBeInTheDocument();
  });

  it('does not show New group action in group menu', () => {
    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'group', x: 10, y: 20, groupId: 'group-1', groupName: 'Finance', colorToken: 'blue' }}
        onCloseMenus={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onStartCreatingGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
        deleteGroupRequest={null}
        onCancelDeleteGroup={vi.fn()}
        onConfirmDeleteGroup={vi.fn()}
        onSetGroupColor={vi.fn()}
        isCreatingGroup={false}
        onCancelCreatingGroup={vi.fn()}
        onConfirmCreatingGroup={vi.fn()}
        isConfirmingDelete={false}
        worksheetToDelete={null}
        onStartDeleteConfirmation={vi.fn()}
        onCancelDeleteConfirmation={vi.fn()}
        onConfirmDelete={vi.fn().mockResolvedValue(undefined)}
        isDeleting={false}
        deleteError={null}
      />,
    );

    expect(screen.queryByRole('button', { name: 'New group' })).not.toBeInTheDocument();
  });

  it('shows remove-from-group only for grouped worksheets', () => {
    const { rerender } = renderSheetMenu({
      activeMenu: { kind: 'sheet', x: 10, y: 20, worksheet: createWorksheet({ groupId: 'group-1' }) },
    });

    expect(screen.getByRole('button', { name: 'Remove from group' })).toBeInTheDocument();

    rerender(
      <TaskpaneMenus
        activeMenu={{ kind: 'sheet', x: 10, y: 20, worksheet: createWorksheet({ groupId: null }) }}
        onCloseMenus={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onStartCreatingGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
        deleteGroupRequest={null}
        onCancelDeleteGroup={vi.fn()}
        onConfirmDeleteGroup={vi.fn()}
        onSetGroupColor={vi.fn()}
        isCreatingGroup={false}
        onCancelCreatingGroup={vi.fn()}
        onConfirmCreatingGroup={vi.fn()}
        isConfirmingDelete={false}
        worksheetToDelete={null}
        onStartDeleteConfirmation={vi.fn()}
        onCancelDeleteConfirmation={vi.fn()}
        onConfirmDelete={vi.fn().mockResolvedValue(undefined)}
        isDeleting={false}
        deleteError={null}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Remove from group' })).not.toBeInTheDocument();
  });

  it('toggles pin and closes the sheet menu', async () => {
    const user = userEvent.setup();
    const worksheet = createWorksheet();
    const onTogglePin = vi.fn();
    const onCloseMenus = vi.fn();

    renderSheetMenu({ onTogglePin, onCloseMenus });

    await user.click(screen.getByRole('button', { name: 'Pin sheet' }));

    expect(onTogglePin).toHaveBeenCalledWith(worksheet);
    expect(onCloseMenus).toHaveBeenCalled();
  });

  it('renames a worksheet without forcing menu close', async () => {
    const user = userEvent.setup();
    const worksheet = createWorksheet();
    const onRenameWorksheet = vi.fn();

    renderSheetMenu({ onRenameWorksheet });

    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(onRenameWorksheet).toHaveBeenCalledWith(worksheet);
  });

  it('deletes a group and closes the group menu', async () => {
    const user = userEvent.setup();
    const onDeleteGroup = vi.fn();
    const onCloseMenus = vi.fn();

    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'group', x: 10, y: 20, groupId: 'group-1', groupName: 'Finance', colorToken: 'blue' }}
        onCloseMenus={onCloseMenus}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onStartCreatingGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={onDeleteGroup}
        deleteGroupRequest={null}
        onCancelDeleteGroup={vi.fn()}
        onConfirmDeleteGroup={vi.fn()}
        onSetGroupColor={vi.fn()}
        isCreatingGroup={false}
        onCancelCreatingGroup={vi.fn()}
        onConfirmCreatingGroup={vi.fn()}
        isConfirmingDelete={false}
        worksheetToDelete={null}
        onStartDeleteConfirmation={vi.fn()}
        onCancelDeleteConfirmation={vi.fn()}
        onConfirmDelete={vi.fn().mockResolvedValue(undefined)}
        isDeleting={false}
        deleteError={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ungroup' }));

    expect(onDeleteGroup).toHaveBeenCalledWith('group-1', 'Finance');
    expect(onCloseMenus).not.toHaveBeenCalled();
  });

  it('shows inline ungroup confirmation in group menu when requested', () => {
    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'group', x: 10, y: 20, groupId: 'group-1', groupName: 'Finance', colorToken: 'blue' }}
        onCloseMenus={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onStartCreatingGroup={vi.fn()}
        onRenameGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
        deleteGroupRequest={{ groupId: 'group-1', groupName: 'Finance' }}
        onCancelDeleteGroup={vi.fn()}
        onConfirmDeleteGroup={vi.fn()}
        onSetGroupColor={vi.fn()}
        isCreatingGroup={false}
        onCancelCreatingGroup={vi.fn()}
        onConfirmCreatingGroup={vi.fn()}
        isConfirmingDelete={false}
        worksheetToDelete={null}
        onStartDeleteConfirmation={vi.fn()}
        onCancelDeleteConfirmation={vi.fn()}
        onConfirmDelete={vi.fn().mockResolvedValue(undefined)}
        isDeleting={false}
        deleteError={null}
      />,
    );

    expect(screen.getByText("Ungroup 'Finance'? Sheets become independent.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel ungroup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm ungroup Finance' })).toBeInTheDocument();
  });

  it('starts inline creation when New group is clicked', async () => {
    const user = userEvent.setup();
    const onStartCreatingGroup = vi.fn();

    renderSheetMenu({ onStartCreatingGroup, isCreatingGroup: false });

    await user.click(screen.getByRole('button', { name: 'New group' }));

    expect(onStartCreatingGroup).toHaveBeenCalledWith('sheet-1');
  });

  it('shows inline group creator when isCreatingGroup is true', async () => {
    const user = userEvent.setup();
    const onConfirmCreatingGroup = vi.fn();
    const onCancelCreatingGroup = vi.fn();

    renderSheetMenu({
      isCreatingGroup: true,
      onConfirmCreatingGroup,
      onCancelCreatingGroup,
    });

    // Input should be visible
    expect(screen.getByLabelText('Name')).toBeInTheDocument();

    // Color options should be visible
    expect(screen.getByLabelText('Color options')).toBeInTheDocument();
  });

  it('creates group on Enter with valid name', async () => {
    const user = userEvent.setup();
    const onConfirmCreatingGroup = vi.fn();

    renderSheetMenu({
      isCreatingGroup: true,
      onConfirmCreatingGroup,
    });

    await user.type(screen.getByLabelText('Name'), 'Finance{Enter}');

    expect(onConfirmCreatingGroup).toHaveBeenCalledWith('Finance', 'none');
  });

  it('does not create group on Enter with empty name', async () => {
    const user = userEvent.setup();
    const onConfirmCreatingGroup = vi.fn();

    renderSheetMenu({
      isCreatingGroup: true,
      onConfirmCreatingGroup,
    });

    await user.type(screen.getByLabelText('Name'), '{Enter}');

    expect(onConfirmCreatingGroup).not.toHaveBeenCalled();
  });

  it('cancels creation and closes menu on Escape', async () => {
    const user = userEvent.setup();
    const onCancelCreatingGroup = vi.fn();
    const onCloseMenus = vi.fn();

    renderSheetMenu({
      isCreatingGroup: true,
      onCancelCreatingGroup,
      onCloseMenus,
    });

    await user.keyboard('{Escape}');

    // Both cancel and close should be called to fully exit creation mode
    expect(onCancelCreatingGroup).toHaveBeenCalled();
    expect(onCloseMenus).toHaveBeenCalled();
  });

  it('closes the menu when clicking the overlay while in creation mode', async () => {
    const user = userEvent.setup();
    const onCloseMenus = vi.fn();

    renderSheetMenu({
      isCreatingGroup: true,
      onCloseMenus,
    });

    await user.click(document.querySelector('.context-menu-layer') as HTMLElement);

    expect(onCloseMenus).toHaveBeenCalled();
  });

  it('closes the menu when clicking the overlay', async () => {
    const user = userEvent.setup();
    const onCloseMenus = vi.fn();

    renderSheetMenu({ onCloseMenus });

    await user.click(document.querySelector('.context-menu-layer') as HTMLElement);

    expect(onCloseMenus).toHaveBeenCalled();
  });

  describe('Delete sheet action', () => {
    it('renders delete sheet button in sheet menu', () => {
      renderSheetMenu();

      expect(screen.getByRole('button', { name: 'Delete sheet' })).toBeInTheDocument();
    });

    it('calls onStartDeleteConfirmation and does NOT close menu when delete is clicked', async () => {
      const user = userEvent.setup();
      const worksheet = createWorksheet();
      const onStartDeleteConfirmation = vi.fn();
      const onCloseMenus = vi.fn();

      renderSheetMenu({ onStartDeleteConfirmation, onCloseMenus });

      await user.click(screen.getByRole('button', { name: 'Delete sheet' }));

      expect(onStartDeleteConfirmation).toHaveBeenCalledWith(worksheet);
      expect(onCloseMenus).not.toHaveBeenCalled();
    });

    it('positions delete action at the end of the menu', () => {
      renderSheetMenu();

      const buttons = screen.getAllByRole('button');
      const deleteButton = screen.getByRole('button', { name: 'Delete sheet' });

      // The last button should be Delete sheet
      expect(buttons[buttons.length - 1]).toBe(deleteButton);
    });

    it('uses DeleteMenuIcon for the delete action', () => {
      renderSheetMenu();

      const deleteButton = screen.getByRole('button', { name: 'Delete sheet' });
      expect(deleteButton).toBeInTheDocument();
      // Icon is rendered as SVG inside the button
      expect(deleteButton.querySelector('svg')).toBeInTheDocument();
    });

    it('shows inline delete confirmation when isConfirmingDelete is true', () => {
      const worksheet = createWorksheet();

      renderSheetMenu({
        isConfirmingDelete: true,
        worksheetToDelete: worksheet,
      });

      // Should show confirmation message
      expect(screen.getByText("Delete 'Revenue'?")).toBeInTheDocument();
      // Should show Cancel and Delete buttons
      expect(screen.getByRole('button', { name: 'Cancel deletion' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm deletion/ })).toBeInTheDocument();
    });

    it('shows delete confirmation instead of menu actions when confirming', () => {
      const worksheet = createWorksheet();

      renderSheetMenu({
        isConfirmingDelete: true,
        worksheetToDelete: worksheet,
      });

      // Menu actions should not be visible
      expect(screen.queryByRole('button', { name: 'Pin sheet' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Hide sheet' })).not.toBeInTheDocument();
    });

    it('calls onCancelDeleteConfirmation when Cancel is clicked in confirmation', async () => {
      const user = userEvent.setup();
      const worksheet = createWorksheet();
      const onCancelDeleteConfirmation = vi.fn();

      renderSheetMenu({
        isConfirmingDelete: true,
        worksheetToDelete: worksheet,
        onCancelDeleteConfirmation,
      });

      await user.click(screen.getByRole('button', { name: 'Cancel deletion' }));

      expect(onCancelDeleteConfirmation).toHaveBeenCalled();
    });

    it('calls onConfirmDelete when Delete is clicked in confirmation', async () => {
      const user = userEvent.setup();
      const worksheet = createWorksheet();
      const onConfirmDelete = vi.fn().mockResolvedValue(undefined);

      renderSheetMenu({
        isConfirmingDelete: true,
        worksheetToDelete: worksheet,
        onConfirmDelete,
      });

      await user.click(screen.getByRole('button', { name: /Confirm deletion/ }));

      expect(onConfirmDelete).toHaveBeenCalled();
    });

    it('displays error message when deleteError is provided', () => {
      const worksheet = createWorksheet();

      renderSheetMenu({
        isConfirmingDelete: true,
        worksheetToDelete: worksheet,
        deleteError: 'Cannot delete last sheet',
      });

      expect(screen.getByText('Cannot delete last sheet')).toBeInTheDocument();
    });

    it('shows deleting state when isDeleting is true', () => {
      const worksheet = createWorksheet();

      renderSheetMenu({
        isConfirmingDelete: true,
        worksheetToDelete: worksheet,
        isDeleting: true,
      });

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
      // Buttons should be disabled
      expect(screen.getByRole('button', { name: 'Cancel deletion' })).toBeDisabled();
    });
  });
});
