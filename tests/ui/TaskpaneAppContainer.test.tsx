import { fireEvent, render, screen } from '@testing-library/react';
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
    pinWorksheet: vi.fn(),
    unpinWorksheet: vi.fn(),
    activateWorksheet: vi.fn().mockResolvedValue(undefined),
    renameWorksheet: vi.fn().mockResolvedValue(undefined),
    unhideWorksheet: vi.fn().mockResolvedValue(undefined),
    hideWorksheet: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
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
});
