import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NavigatorView, WorksheetEntity } from '../../src/domain/navigation/types';
import { TaskpaneSections } from '../../src/ui/taskpane/components/TaskpaneSections';

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DragOverlay: ({
      children,
      className,
    }: {
      children?: ReactNode;
      className?: string;
    }) => (
      <div data-testid="drag-overlay" className={className}>
        {children}
      </div>
    ),
  };
});

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

function createNavigatorView(): NavigatorView {
  return {
    pinned: [],
    groups: [],
    ungrouped: [createWorksheet()],
    hidden: [],
    searchResults: [],
  };
}

function createBaseProps(overrides: Partial<ComponentProps<typeof TaskpaneSections>> = {}) {
  return {
    query: '',
    searchResults: [],
    navigatorView: createNavigatorView(),
    activeWorksheetId: null,
    isHiddenSectionCollapsed: false,
    dragConfig: {
      activeDragWorksheet: null,
      sensors: [],
      projectedDropTarget: null,
      flashedGroupId: null,
      isDragActive: false,
      shouldSuppressActivation: () => false,
      onDragStart: vi.fn(),
      onDragOver: vi.fn(),
      onDragEnd: vi.fn(),
      onDragCancel: vi.fn(),
    },
    onChangeQuery: vi.fn(),
    onSelectSearchResult: vi.fn(),
    onActivateWorksheet: vi.fn().mockResolvedValue(undefined),
    onPinWorksheet: vi.fn(),
    onUnpinWorksheet: vi.fn(),
    onToggleGroupCollapsed: vi.fn(),
    onToggleHiddenSection: vi.fn(),
    onUnhideWorksheet: vi.fn().mockResolvedValue(undefined),
    onOpenSheetMenu: vi.fn(),
    onOpenGroupMenu: vi.fn(),
    ...overrides,
  };
}

describe('TaskpaneSections', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a drag overlay for the active dragged worksheet', () => {
    const worksheet = createWorksheet();

    render(
      <TaskpaneSections
        {...createBaseProps({
          dragConfig: {
            activeDragWorksheet: worksheet,
            sensors: [],
            projectedDropTarget: null,
            flashedGroupId: null,
            isDragActive: true,
            shouldSuppressActivation: () => false,
            onDragStart: vi.fn(),
            onDragOver: vi.fn(),
            onDragEnd: vi.fn(),
            onDragCancel: vi.fn(),
          },
        })}
      />,
    );

    const overlayRoot = screen.getByTestId('drag-overlay');
    expect(overlayRoot).toHaveClass('worksheet-drag-overlay');

    const overlayRows = overlayRoot.querySelectorAll('.sheet-row-overlay');
    expect(overlayRows).toHaveLength(1);
    expect(overlayRows[0]).toHaveAttribute('aria-label', 'Revenue');
  });

  it('renders a subtle groups session-only hint only when groups exist', () => {
    const navigatorView = createNavigatorView();
    navigatorView.groups = [{
      groupId: 'group-1',
      name: 'Finance',
      colorToken: 'green',
      isCollapsed: false,
      worksheets: [],
    }];

    render(
      <TaskpaneSections
        {...createBaseProps({
          isSessionOnlyPersistence: true,
          navigatorView,
        })}
      />,
    );

    expect(screen.getByRole('button', {
      name: 'This workbook has not been saved yet. Group changes persist only for this session.',
    })).toHaveAttribute('title', 'This workbook has not been saved yet. Group changes persist only for this session.');
  });

  it('navigates continuously through expanded group header and worksheets with ArrowDown/ArrowUp', async () => {
    const user = userEvent.setup();
    const onActivateWorksheet = vi.fn().mockResolvedValue(undefined);

    const navigatorView: NavigatorView = {
      pinned: [createWorksheet({ worksheetId: 'pinned-1', name: 'Pinned One', isPinned: true, groupId: null })],
      groups: [
        {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'green',
          isCollapsed: false,
          worksheets: [
            createWorksheet({ worksheetId: 'group-1-sheet-1', name: 'Budget', groupId: 'group-1' }),
            createWorksheet({ worksheetId: 'group-1-sheet-2', name: 'Forecast', groupId: 'group-1' }),
          ],
        },
      ],
      ungrouped: [createWorksheet({ worksheetId: 'sheet-ungrouped-1', name: 'Summary', groupId: null })],
      hidden: [],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          onActivateWorksheet,
        })}
      />,
    );

    const pinnedRow = screen.getByRole('button', { name: 'Pinned One' });
    pinnedRow.focus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Finance' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Budget' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Forecast' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Summary' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'Forecast' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'Budget' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'Finance' })).toHaveFocus();
  });

  it('uses ArrowRight/ArrowLeft only on group headers and keeps ArrowDown/ArrowUp for row traversal', async () => {
    const user = userEvent.setup();
    const onToggleGroupCollapsed = vi.fn();

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [
        {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'green',
          isCollapsed: false,
          worksheets: [
            createWorksheet({ worksheetId: 'group-1-sheet-1', name: 'Budget', groupId: 'group-1' }),
          ],
        },
      ],
      ungrouped: [createWorksheet({ worksheetId: 'sheet-ungrouped-1', name: 'Summary', groupId: null })],
      hidden: [],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          onToggleGroupCollapsed,
        })}
      />,
    );

    const groupHeader = screen.getByRole('button', { name: 'Finance' });
    groupHeader.focus();

    await user.keyboard('{ArrowLeft}');
    expect(onToggleGroupCollapsed).toHaveBeenCalledWith('group-1');

    onToggleGroupCollapsed.mockClear();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Budget' })).toHaveFocus();
    expect(onToggleGroupCollapsed).not.toHaveBeenCalled();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Summary' })).toHaveFocus();
  });

  it('collapses parent group when pressing ArrowLeft on worksheet inside that group', async () => {
    const user = userEvent.setup();
    const onToggleGroupCollapsed = vi.fn();

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [
        {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'green',
          isCollapsed: false,
          worksheets: [
            createWorksheet({ worksheetId: 'group-1-sheet-1', name: 'Budget', groupId: 'group-1' }),
            createWorksheet({ worksheetId: 'group-1-sheet-2', name: 'Forecast', groupId: 'group-1' }),
          ],
        },
      ],
      ungrouped: [createWorksheet({ worksheetId: 'sheet-ungrouped-1', name: 'Summary', groupId: null })],
      hidden: [],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          onToggleGroupCollapsed,
        })}
      />,
    );

    const budgetRow = screen.getByRole('button', { name: 'Budget' });
    budgetRow.focus();

    await user.keyboard('{ArrowLeft}');

    expect(onToggleGroupCollapsed).toHaveBeenCalledWith('group-1');
  });

  it('keeps keyboard highlight in sync with mouse selection (no stale focused row)', async () => {
    const user = userEvent.setup();
    const onActivateWorksheet = vi.fn().mockResolvedValue(undefined);

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [],
      ungrouped: [
        createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue' }),
        createWorksheet({ worksheetId: 'sheet-2', name: 'Forecast' }),
      ],
      hidden: [],
      searchResults: [],
    };

    const { container } = render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          onActivateWorksheet,
        })}
      />,
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    revenueRow.focus();
    await user.keyboard('{ArrowDown}');

    const forecastRow = screen.getByRole('button', { name: 'Forecast' });
    expect(forecastRow).toHaveFocus();

    const revenueArticle = revenueRow.closest('[data-navigable-id="worksheet:sheet-1"]');
    const forecastArticle = forecastRow.closest('[data-navigable-id="worksheet:sheet-2"]');
    expect(revenueArticle).toBeTruthy();
    expect(forecastArticle).toBeTruthy();

    // Mouse click on Revenue should transfer focused state from Forecast to Revenue.
    fireEvent.pointerDown(revenueRow);
    await user.click(revenueRow);

    expect(onActivateWorksheet).toHaveBeenCalledWith('sheet-1');
    expect(revenueArticle).toHaveAttribute('data-focused', 'true');
    expect(forecastArticle).toHaveAttribute('data-focused', 'false');

    // There should be exactly one focused navigable item.
    expect(container.querySelectorAll('[data-focused="true"]').length).toBe(1);
  });

  it('clears keyboard navigation focus when pressing Escape', async () => {
    const user = userEvent.setup();

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [],
      ungrouped: [
        createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue' }),
        createWorksheet({ worksheetId: 'sheet-2', name: 'Forecast' }),
      ],
      hidden: [],
      searchResults: [],
    };

    const { container } = render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
        })}
      />,
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    revenueRow.focus();
    await user.keyboard('{ArrowDown}');

    expect(container.querySelectorAll('[data-focused="true"]').length).toBe(1);

    await user.keyboard('{Escape}');

    expect(container.querySelectorAll('[data-focused="true"]').length).toBe(0);
  });

  it('clears keyboard navigation focus after inactivity timeout', async () => {
    vi.useFakeTimers();

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [],
      ungrouped: [
        createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue' }),
        createWorksheet({ worksheetId: 'sheet-2', name: 'Forecast' }),
      ],
      hidden: [],
      searchResults: [],
    };

    const { container } = render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
        })}
      />,
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    revenueRow.focus();
    fireEvent.keyDown(revenueRow, { key: 'ArrowDown', code: 'ArrowDown' });

    expect(container.querySelectorAll('[data-focused="true"]').length).toBe(1);

    // 3 seconds idle timeout for keyboard focus clear
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(container.querySelectorAll('[data-focused="true"]').length).toBe(0);
  }, 10000);

  it('restarts keyboard navigation from active worksheet after idle clear', () => {
    vi.useFakeTimers();

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [],
      ungrouped: [
        createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue' }),
        createWorksheet({ worksheetId: 'sheet-2', name: 'Forecast' }),
        createWorksheet({ worksheetId: 'sheet-3', name: 'Summary' }),
      ],
      hidden: [],
      searchResults: [],
    };

    const { container } = render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          activeWorksheetId: 'sheet-2',
        })}
      />,
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    revenueRow.focus();
    fireEvent.keyDown(revenueRow, { key: 'ArrowDown', code: 'ArrowDown' });

    // Idle clear removes transient keyboard focus state
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(container.querySelectorAll('[data-focused="true"]').length).toBe(0);

    // Next arrow key should anchor from active worksheet (Forecast) and move to Summary.
    const activeRow = screen.getByRole('button', { name: 'Forecast' });
    fireEvent.keyDown(activeRow, { key: 'ArrowDown', code: 'ArrowDown' });

    const summaryArticle = screen.getByRole('button', { name: 'Summary' }).closest('[data-navigable-id="worksheet:sheet-3"]');
    expect(summaryArticle).toHaveAttribute('data-focused', 'true');
  });
});
