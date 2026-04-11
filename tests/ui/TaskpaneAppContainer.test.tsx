import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { TaskpaneAppContainer } from '../../src/ui/taskpane/TaskpaneAppContainer';

const { useNavigationControllerMock } = vi.hoisted(() => ({
  useNavigationControllerMock: vi.fn(),
}));

vi.mock('../../src/application/navigation/useNavigationController', () => ({
  useNavigationController: useNavigationControllerMock,
}));

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

function createControllerMock() {
  const worksheet = createWorksheet();

  return {
    state: {
      worksheetsById: { [worksheet.worksheetId]: worksheet },
      groupsById: {},
      groupOrder: [],
      sheetSectionOrder: [worksheet.worksheetId],
      hiddenSectionCollapsed: false,
      query: '',
      activeWorksheetId: null,
      lastSyncAt: null,
      isReady: true,
    },
    navigatorView: {
      pinned: [],
      groups: [],
      ungrouped: [worksheet],
      hidden: [],
      searchResults: [],
    },
    isBusy: false,
    errorMessage: null,
    setQuery: vi.fn(),
    toggleGroupCollapsed: vi.fn(),
    toggleHiddenSection: vi.fn(),
    createGroup: vi.fn(),
    renameGroup: vi.fn(),
    deleteGroup: vi.fn(),
    assignWorksheetToGroup: vi.fn(),
    removeWorksheetFromGroup: vi.fn(),
    reorderGroupWorksheet: vi.fn(),
    reorderSheetSectionWorksheet: vi.fn(),
    pinWorksheet: vi.fn(),
    unpinWorksheet: vi.fn(),
    activateWorksheet: vi.fn().mockResolvedValue(undefined),
    renameWorksheet: vi.fn().mockResolvedValue(undefined),
    unhideWorksheet: vi.fn().mockResolvedValue(undefined),
    hideWorksheet: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
  };
}

function createDragDataTransfer() {
  return {
    effectAllowed: 'move',
    dropEffect: 'move',
    setData: vi.fn(),
    getData: vi.fn(),
  };
}

describe('TaskpaneAppContainer', () => {
  it('opens rename dialog from worksheet context menu', async () => {
    const user = userEvent.setup();
    useNavigationControllerMock.mockReturnValue(createControllerMock());

    render(<TaskpaneAppContainer />);

    const worksheetButton = screen.getByRole('button', { name: 'Revenue' });
    const worksheetRow = worksheetButton.closest('article');

    expect(worksheetRow).not.toBeNull();
    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });

    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(screen.getByRole('heading', { name: 'Rename sheet' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Revenue');
  });

  it('creates a group from the sheet menu using the source worksheet id', async () => {
    const user = userEvent.setup();
    const controller = createControllerMock();
    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    const worksheetButton = screen.getByRole('button', { name: 'Revenue' });
    const worksheetRow = worksheetButton.closest('article');

    expect(worksheetRow).not.toBeNull();
    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });

    await user.click(screen.getByRole('button', { name: 'New group' }));
    await user.type(screen.getByLabelText('Name'), 'Finance');
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(controller.createGroup).toHaveBeenCalledWith('Finance', 'sheet-1');
  });

  it('closes worksheet context menu when right-clicking the same row twice', () => {
    useNavigationControllerMock.mockReturnValue(createControllerMock());

    render(<TaskpaneAppContainer />);

    const worksheetButton = screen.getByRole('button', { name: 'Revenue' });
    const worksheetRow = worksheetButton.closest('article');

    expect(worksheetRow).not.toBeNull();
    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();

    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
  });

  it('confirms group deletion through product-owned dialog instead of browser confirm', async () => {
    const user = userEvent.setup();
    const controller = createControllerMock() as any;
    const group = {
      groupId: 'group-1',
      name: 'Finance',
      colorToken: 'green' as const,
      isCollapsed: false,
      worksheets: [],
    };

    controller.state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: false,
        worksheetOrder: [],
        createdAt: 1,
      },
    };
    controller.state.groupOrder = ['group-1'];
    controller.navigatorView.groups = [group];

    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    const groupButton = screen.getByRole('button', { name: 'Finance' });
    const groupRow = groupButton.closest('section');

    expect(groupRow).not.toBeNull();
    fireEvent.contextMenu(groupRow as HTMLElement, { clientX: 120, clientY: 80 });

    await user.click(screen.getByRole('button', { name: 'Delete group' }));

    expect(screen.getByRole('heading', { name: 'Delete group' })).toBeInTheDocument();
    expect(screen.getByText('Delete Finance? Sheets will become ungrouped.')).toBeInTheDocument();

    const confirmDialog = screen.getByRole('dialog', { name: 'Delete group' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete group' }));

    expect(controller.deleteGroup).toHaveBeenCalledWith('group-1');
  });

  it('drops an ungrouped sheet into a group header', () => {
    const controller = createControllerMock() as any;
    controller.state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: false,
        worksheetOrder: [],
        createdAt: 1,
      },
    };
    controller.state.groupOrder = ['group-1'];
    controller.navigatorView.groups = [
      {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: false,
        worksheets: [],
      },
    ];

    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    const dataTransfer = createDragDataTransfer();
    const worksheetRow = screen.getByRole('button', { name: 'Revenue' }).closest('article');
    const groupHeader = screen.getByRole('button', { name: 'Finance' }).closest('header');

    expect(worksheetRow).not.toBeNull();
    expect(groupHeader).not.toBeNull();

    fireEvent.dragStart(worksheetRow as HTMLElement, { dataTransfer });
    fireEvent.dragOver(groupHeader as HTMLElement, { dataTransfer });
    fireEvent.drop(groupHeader as HTMLElement, { dataTransfer });
    fireEvent.dragEnd(worksheetRow as HTMLElement, { dataTransfer });

    expect(controller.assignWorksheetToGroup).toHaveBeenCalledWith('sheet-1', 'group-1', 0);
  });

  it('drops a grouped sheet back into the Sheets section', () => {
    const controller = createControllerMock() as any;
    const groupedWorksheet = createWorksheet({ worksheetId: 'sheet-2', name: 'Budget', groupId: 'group-1', isPinned: false });

    controller.state.worksheetsById = { [groupedWorksheet.worksheetId]: groupedWorksheet };
    controller.state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: false,
        worksheetOrder: ['sheet-2'],
        createdAt: 1,
      },
    };
    controller.state.groupOrder = ['group-1'];
    controller.state.sheetSectionOrder = ['sheet-2'];
    controller.navigatorView.groups = [
      {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: false,
        worksheets: [groupedWorksheet],
      },
    ];
    controller.navigatorView.ungrouped = [];

    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    const dataTransfer = createDragDataTransfer();
    const groupedRow = screen.getByRole('button', { name: 'Budget' }).closest('article');

    expect(groupedRow).not.toBeNull();

    fireEvent.dragStart(groupedRow as HTMLElement, { dataTransfer });
    fireEvent.dragOver(screen.getByTestId('sheet-section-drop-0'), { dataTransfer });
    fireEvent.drop(screen.getByTestId('sheet-section-drop-0'), { dataTransfer });
    fireEvent.dragEnd(groupedRow as HTMLElement, { dataTransfer });

    expect(controller.removeWorksheetFromGroup).toHaveBeenCalledWith('sheet-2', 0);
  });

  it('reorders an ungrouped sheet upward when dropped on a row body', () => {
    const controller = createControllerMock() as any;
    const topWorksheet = createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue', workbookOrder: 1 });
    const bottomWorksheet = createWorksheet({ worksheetId: 'sheet-2', name: 'Budget', workbookOrder: 2 });

    controller.state.worksheetsById = {
      'sheet-1': topWorksheet,
      'sheet-2': bottomWorksheet,
    };
    controller.state.sheetSectionOrder = ['sheet-1', 'sheet-2'];
    controller.navigatorView.ungrouped = [topWorksheet, bottomWorksheet];

    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    const dataTransfer = createDragDataTransfer();
    const draggedRow = screen.getByRole('button', { name: 'Budget' }).closest('article');
    const targetRow = screen.getByRole('button', { name: 'Revenue' }).closest('article');

    expect(draggedRow).not.toBeNull();
    expect(targetRow).not.toBeNull();

    vi.spyOn(targetRow as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 200,
      bottom: 40,
      width: 200,
      height: 40,
      toJSON: () => ({}),
    });

    fireEvent.dragStart(draggedRow as HTMLElement, { dataTransfer });
    fireEvent.dragOver(targetRow as HTMLElement, { dataTransfer, clientY: 5 });
    fireEvent.drop(targetRow as HTMLElement, { dataTransfer, clientY: 5 });
    fireEvent.dragEnd(draggedRow as HTMLElement, { dataTransfer });

    expect(controller.reorderSheetSectionWorksheet).toHaveBeenCalledWith('sheet-2', 0);
  });
});
