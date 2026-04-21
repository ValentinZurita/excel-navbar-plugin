import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BannerState, WorksheetEntity } from '../../src/domain/navigation/types';
import { PERSISTENCE_BANNER_AUTO_DISMISS_MS } from '../../src/ui/taskpane/hooks/usePersistenceBannerAutoDismiss';
import { TaskpaneAppContainer } from '../../src/ui/taskpane/TaskpaneAppContainer';

const { useNavigationControllerMock, useWorksheetDnDMock } = vi.hoisted(() => ({
  useNavigationControllerMock: vi.fn(),
  useWorksheetDnDMock: vi.fn(),
}));

vi.mock('../../src/application/navigation/useNavigationController', () => ({
  useNavigationController: useNavigationControllerMock,
}));

vi.mock('../../src/ui/taskpane/hooks/useWorksheetDnD', () => ({
  useWorksheetDnD: useWorksheetDnDMock,
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
    isSessionOnlyPersistence: false,
    setQuery: vi.fn(),
    toggleGroupCollapsed: vi.fn(),
    setGroupCollapsed: vi.fn(),
    toggleHiddenSection: vi.fn(),
    createGroup: vi.fn(),
    renameGroup: vi.fn(),
    deleteGroup: vi.fn(),
    deleteGroupAndWorksheets: vi.fn().mockResolvedValue(undefined),
    assignWorksheetToGroup: vi.fn(),
    removeWorksheetFromGroup: vi.fn(),
    reorderGroupWorksheet: vi.fn(),
    reorderSheetSectionWorksheet: vi.fn(),
    reorderPinnedWorksheet: vi.fn(),
    pinWorksheet: vi.fn(),
    unpinWorksheet: vi.fn(),
    createWorksheet: vi.fn().mockResolvedValue(undefined),
    activateWorksheet: vi.fn().mockResolvedValue(undefined),
    renameWorksheet: vi.fn().mockResolvedValue(undefined),
    unhideWorksheet: vi.fn().mockResolvedValue(undefined),
    hideWorksheet: vi.fn().mockResolvedValue(undefined),
    restoreGroup: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
    dismissBanner: vi.fn(),
  };

  return controller;
}

describe('TaskpaneAppContainer', () => {
  function createDnDMock(overrides: Record<string, unknown> = {}) {
    return {
      sensors: [],
      activeWorksheetId: null,
      projectedDropTarget: null,
      flashedGroupId: null,
      shouldSuppressActivation: () => false,
      onDragStart: vi.fn(),
      onDragOver: vi.fn(),
      onDragEnd: vi.fn(),
      onDragCancel: vi.fn(),
      ...overrides,
    };
  }

  beforeEach(() => {
    useWorksheetDnDMock.mockReturnValue(createDnDMock());
  });

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
    // Regression: post-menu DOM focus restore must not steal focus from the rename field
    // (blur would call onCancel and end rename immediately).
    await waitFor(() => {
      expect(renameInput).toHaveFocus();
    });
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

    expect(controller.createGroup).toHaveBeenCalledWith('Finance', 'none', 'sheet-1');

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
    expect(screen.getByRole('button', { name: 'Pin sheet' })).toBeInTheDocument();
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

  it('confirms group deletion through inline group menu confirmation', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Ungroup' }));

    expect(screen.getByText("Ungroup 'Finance'? Sheets become independent.")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm ungroup Finance' }));

    expect(controller.deleteGroup).toHaveBeenCalledWith('group-1');
  });

  it('confirms delete group and sheets through inline group menu', async () => {
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
        worksheetOrder: ['sheet-a', 'sheet-b'],
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

    await user.click(screen.getByRole('button', { name: 'Delete group and sheets…' }));

    expect(
      screen.getByText("Delete group 'Finance' and all 2 sheet(s) in it? This cannot be undone."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm delete all sheets in group Finance' }));

    expect(controller.deleteGroupAndWorksheets).toHaveBeenCalledWith('group-1');
  });

  it('renders warning banners when the controller exposes one', () => {
    const controller = createControllerMock();
    const sessionBanner: BannerState = {
      tone: 'warning',
      message: 'We could not save to this workbook, but your navigation state was cached locally for this workbook on this device.',
    };
    controller.banner = sessionBanner;
    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    expect(screen.getByText(sessionBanner.message)).toBeInTheDocument();
  });

  it('dismisses persistence banners when the close control is used', async () => {
    const user = userEvent.setup();
    const controller = createControllerMock();
    controller.banner = {
      tone: 'warning',
      message: 'We could not save this workbook state, and local recovery is unavailable until the file is saved.',
    };
    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(controller.dismissBanner).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses persistence banners after fourteen seconds', () => {
    vi.useFakeTimers();
    const controller = createControllerMock();
    controller.banner = {
      tone: 'warning',
      message: 'Persistence banner timeout body',
    };
    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);
    expect(screen.getByText('Persistence banner timeout body')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(PERSISTENCE_BANNER_AUTO_DISMISS_MS);
    });

    expect(controller.dismissBanner).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('renders the groups session-only hint instead of a banner', () => {
    const controller = createControllerMock();
    controller.isSessionOnlyPersistence = true;
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
    controller.navigatorView.groups = [{
      groupId: 'group-1',
      name: 'Finance',
      colorToken: 'green',
      isCollapsed: false,
      worksheets: [],
    }];
    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    expect(screen.getByRole('button', {
      name: 'This workbook has not been saved yet. Group changes persist only for this session.',
    })).toBeInTheDocument();
  });

  it('creates worksheet from floating add button', async () => {
    const user = userEvent.setup();
    const controller = createControllerMock();
    useNavigationControllerMock.mockReturnValue(controller);
    useWorksheetDnDMock.mockReturnValue(createDnDMock());

    render(<TaskpaneAppContainer />);

    await user.click(screen.getByRole('button', { name: 'Add worksheet' }));

    expect(controller.createWorksheet).toHaveBeenCalledTimes(1);
  });

  it('shows undo toast when removing last sheet from group and restores on undo', async () => {
    const user = userEvent.setup();
    const controller = createControllerMock() as any;
    const groupedWorksheet = createWorksheet({ groupId: 'group-1' });
    controller.state.worksheetsById = { [groupedWorksheet.worksheetId]: groupedWorksheet };
    controller.state.groupsById = {
      'group-1': {
        groupId: 'group-1',
        name: 'Finance',
        colorToken: 'green',
        isCollapsed: false,
        worksheetOrder: ['sheet-1'],
        createdAt: 1,
      },
    };
    controller.state.groupOrder = ['group-1'];
    controller.navigatorView.ungrouped = [groupedWorksheet];

    useNavigationControllerMock.mockReturnValue(controller);

    render(<TaskpaneAppContainer />);

    const worksheetButton = screen.getByRole('button', { name: 'Revenue' });
    const worksheetRow = worksheetButton.closest('article');
    expect(worksheetRow).not.toBeNull();
    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });

    await user.click(screen.getByRole('button', { name: 'Remove from group' }));

    expect(controller.removeWorksheetFromGroup).toHaveBeenCalledWith('sheet-1', undefined);
    expect(screen.getByText('Group Finance removed.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(controller.restoreGroup).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'group-1', name: 'Finance' }),
      'sheet-1',
      0,
    );
  });

  it('hides floating add button while dragging worksheet', () => {
    useNavigationControllerMock.mockReturnValue(createControllerMock());
    useWorksheetDnDMock.mockReturnValue(createDnDMock({ activeWorksheetId: 'sheet-1' }));

    render(<TaskpaneAppContainer />);

    expect(screen.queryByRole('button', { name: 'Add worksheet' })).not.toBeInTheDocument();
  });
});
