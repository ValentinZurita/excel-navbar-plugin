import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BannerState, WorksheetEntity } from '../../src/domain/navigation/types';
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
  const banner: BannerState | null = null;
  const controller: any = {
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
    banner,
    setQuery: vi.fn(),
    toggleGroupCollapsed: vi.fn(),
    setGroupCollapsed: vi.fn(),
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

  return controller;
}

describe('TaskpaneAppContainer', () => {
  it('starts inline rename from worksheet context menu', async () => {
    const user = userEvent.setup();
    useNavigationControllerMock.mockReturnValue(createControllerMock());

    render(<TaskpaneAppContainer />);

    const worksheetButton = screen.getByRole('button', { name: 'Revenue' });
    const worksheetRow = worksheetButton.closest('article');

    expect(worksheetRow).not.toBeNull();
    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });

    await user.click(screen.getByRole('button', { name: 'Rename' }));

    const renameInput = await screen.findByLabelText('Name');
    expect(renameInput).toHaveValue('Revenue');
    expect(renameInput).toHaveClass('inline-rename-input');
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

    // Click "New group" to start inline creation
    await user.click(screen.getByRole('button', { name: 'New group' }));

    // Inline creator should be visible
    expect(screen.getByLabelText('Name')).toBeInTheDocument();

    // Type name and press Enter (no button needed)
    await user.type(screen.getByLabelText('Name'), 'Finance{Enter}');

    expect(controller.createGroup).toHaveBeenCalledWith('Finance', 'sheet-1');

    // Menu should be closed after successful creation
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('shows action menu after canceling creation with Escape', async () => {
    const user = userEvent.setup();
    useNavigationControllerMock.mockReturnValue(createControllerMock());

    render(<TaskpaneAppContainer />);

    const worksheetButton = screen.getByRole('button', { name: 'Revenue' });
    const worksheetRow = worksheetButton.closest('article');

    expect(worksheetRow).not.toBeNull();
    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });

    // Start inline creation
    await user.click(screen.getByRole('button', { name: 'New group' }));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();

    // Cancel with Escape
    await user.keyboard('{Escape}');

    // Menu should be closed
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New group' })).not.toBeInTheDocument();

    // Open menu again - should show action menu, not creation
    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });
    expect(screen.getByRole('button', { name: 'Pin tab' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New group' })).toBeInTheDocument();
    // Should NOT show the inline creator
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
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

  it('renders the persistence banner when the controller exposes one', () => {
    const controller = createControllerMock();
    const sessionBanner: BannerState = {
      tone: 'info',
      message: 'This workbook does not have a stable file identity yet. Groups will persist only for this session.',
    };
    controller.banner = sessionBanner;
    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    expect(screen.getByText(sessionBanner.message)).toBeInTheDocument();
  });
});
