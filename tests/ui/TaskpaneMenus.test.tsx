import { render, screen, within } from '@testing-library/react';
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
      onSetGroupColor={vi.fn()}
      isCreatingGroup={false}
      onCancelCreatingGroup={vi.fn()}
      onConfirmCreatingGroup={vi.fn()}
      {...overrides}
    />,
  );
}

describe('TaskpaneMenus', () => {
  it('renders sheet actions from the active menu kind', () => {
    renderSheetMenu();

    expect(screen.getByRole('button', { name: 'Pin tab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide sheet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('shows color picker directly when group menu is open', () => {
    render(
      <TaskpaneMenus
        activeMenu={{ kind: 'group', x: 10, y: 20, groupId: 'group-1', groupName: 'Finance', colorToken: 'blue' }}
        onCloseMenus={vi.fn()}
        onTogglePin={vi.fn()}
        onToggleVisibility={vi.fn()}
        onRenameWorksheet={vi.fn()}
        onRemoveFromGroup={vi.fn()}
        onStartCreatingGroup={vi.fn()}
        onSetGroupColor={vi.fn()}
        isCreatingGroup={false}
        onCancelCreatingGroup={vi.fn()}
        onConfirmCreatingGroup={vi.fn()}
      />,
    );

    // Color picker grid is shown directly — 7 options (none + 6 colors)
    const colorPicker = screen.getByRole('group', { name: 'Color options' });
    const colorButtons = within(colorPicker).getAllByRole('button');
    expect(colorButtons).toHaveLength(7);

    // Current color (blue) is selected
    expect(screen.getByRole('button', { name: 'Select blue', pressed: true })).toBeInTheDocument();
  });

  it('applies color and closes menu when a color is selected', async () => {
    const user = userEvent.setup();
    const onSetGroupColor = vi.fn();
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
        onSetGroupColor={onSetGroupColor}
        isCreatingGroup={false}
        onCancelCreatingGroup={vi.fn()}
        onConfirmCreatingGroup={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Select green' }));

    expect(onSetGroupColor).toHaveBeenCalledWith('group-1', 'green');
    expect(onCloseMenus).toHaveBeenCalled();
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
        onSetGroupColor={vi.fn()}
        isCreatingGroup={false}
        onCancelCreatingGroup={vi.fn()}
        onConfirmCreatingGroup={vi.fn()}
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

    await user.click(screen.getByRole('button', { name: 'Pin tab' }));

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

  it('starts inline creation when New group is clicked', async () => {
    const user = userEvent.setup();
    const onStartCreatingGroup = vi.fn();

    renderSheetMenu({ onStartCreatingGroup, isCreatingGroup: false });

    await user.click(screen.getByRole('button', { name: 'New group' }));

    expect(onStartCreatingGroup).toHaveBeenCalledWith('sheet-1');
  });

  it('shows inline group creator when isCreatingGroup is true', async () => {
    renderSheetMenu({
      isCreatingGroup: true,
      onConfirmCreatingGroup: vi.fn(),
      onCancelCreatingGroup: vi.fn(),
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
});
