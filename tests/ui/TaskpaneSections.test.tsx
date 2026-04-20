import { render, screen, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type ComponentProps, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NavigatorView, WorksheetEntity } from '../../src/domain/navigation/types';
import {
  TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS,
} from '../../src/application/navigation/useKeyboardNavigation';
import { HIGHLIGHT_EXIT_MS } from '../../src/application/navigation/useHighlightLifecycle';
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
    onRequestSheetContextMenuFromKeyboard: vi.fn(),
    onOpenGroupMenu: vi.fn(),
    searchInputRef: createRef<HTMLInputElement>(),
    ...overrides,
  };
}

function SearchQueryHarness(props: Omit<ComponentProps<typeof TaskpaneSections>, 'query' | 'onChangeQuery'>) {
  const [query, setQuery] = useState(props.searchResults.length > 0 ? 're' : '');

  return (
    <TaskpaneSections
      {...props}
      query={query}
      onChangeQuery={setQuery}
    />
  );
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

  it('opens sheet context menu from keyboard with ArrowRight on a worksheet row', async () => {
    const user = userEvent.setup();
    const onRequestSheetContextMenuFromKeyboard = vi.fn();

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [],
      ungrouped: [
        createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue', groupId: null }),
        createWorksheet({ worksheetId: 'sheet-2', name: 'Forecast', groupId: null }),
      ],
      hidden: [],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          onRequestSheetContextMenuFromKeyboard,
        })}
      />,
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    revenueRow.focus();

    await user.keyboard('{ArrowRight}');

    expect(onRequestSheetContextMenuFromKeyboard).toHaveBeenCalledTimes(1);
    expect(onRequestSheetContextMenuFromKeyboard).toHaveBeenCalledWith({
      worksheetId: 'sheet-1',
      anchorElement: revenueRow,
    });
  });

  it('uses ArrowRight/ArrowLeft on group headers and keeps ArrowDown/ArrowUp for row traversal', async () => {
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
    expect(revenueArticle).toHaveAttribute('data-visual-focused', 'true');
    expect(forecastArticle).toHaveAttribute('data-visual-focused', 'false');

    // There should be exactly one focused navigable item.
    expect(container.querySelectorAll('[data-visual-focused="true"]').length).toBe(1);
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

    expect(container.querySelectorAll('[data-visual-focused="true"]').length).toBe(1);

    await user.keyboard('{Escape}');

    expect(container.querySelectorAll('[data-visual-focused="true"]').length).toBe(0);
    expect(document.activeElement).toBe(document.body);
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
          activeWorksheetId: 'sheet-1',
        })}
      />,
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    revenueRow.focus();
    fireEvent.keyDown(revenueRow, { key: 'ArrowDown', code: 'ArrowDown' });

    expect(container.querySelectorAll('[data-visual-focused="true"]').length).toBe(1);

    act(() => {
      vi.advanceTimersByTime(TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS);
    });

    expect(container.querySelectorAll('[data-visual-focused="true"]').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Revenue' }).closest('[data-navigable-id="worksheet:sheet-1"]')).toHaveAttribute('data-visual-focused', 'true');
    expect(container.querySelectorAll('[data-visual-exiting="true"]').length).toBe(1);

    act(() => {
      vi.advanceTimersByTime(HIGHLIGHT_EXIT_MS);
    });

    expect(container.querySelectorAll('[data-visual-exiting="true"]').length).toBe(0);
    expect(document.activeElement).toBe(document.body);
  }, 10000);

  it('postpones idle highlight return while the pointer moves inside the task pane shell', () => {
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
      <main className="taskpane-shell">
        <TaskpaneSections
          {...createBaseProps({
            navigatorView,
            activeWorksheetId: 'sheet-1',
          })}
        />
      </main>,
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    revenueRow.focus();
    fireEvent.keyDown(revenueRow, { key: 'ArrowDown', code: 'ArrowDown' });

    const forecastArticle = screen.getByRole('button', { name: 'Forecast' }).closest('[data-navigable-id="worksheet:sheet-2"]');
    expect(forecastArticle).toHaveAttribute('data-visual-focused', 'true');

    act(() => {
      vi.advanceTimersByTime(TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS - 100);
    });
    expect(forecastArticle).toHaveAttribute('data-visual-focused', 'true');

    fireEvent.pointerMove(revenueRow, { clientX: 2, clientY: 2, bubbles: true });

    act(() => {
      vi.advanceTimersByTime(TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS - 100);
    });
    expect(forecastArticle).toHaveAttribute('data-visual-focused', 'true');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(container.querySelectorAll('[data-visual-focused="true"]').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Revenue' }).closest('[data-navigable-id="worksheet:sheet-1"]')).toHaveAttribute('data-visual-focused', 'true');
  });

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

    act(() => {
      vi.advanceTimersByTime(TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS);
    });
    expect(container.querySelectorAll('[data-visual-focused="true"]').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Forecast' }).closest('[data-navigable-id="worksheet:sheet-2"]')).toHaveAttribute('data-visual-focused', 'true');

    // Next arrow key should anchor from active worksheet (Forecast) and move to Summary.
    const activeRow = screen.getByRole('button', { name: 'Forecast' });
    fireEvent.keyDown(activeRow, { key: 'ArrowDown', code: 'ArrowDown' });

    const summaryArticle = screen.getByRole('button', { name: 'Summary' }).closest('[data-navigable-id="worksheet:sheet-3"]');
    expect(summaryArticle).toHaveAttribute('data-visual-focused', 'true');
  });

  it('keeps search result pointer and keyboard navigation in sync', async () => {
    const user = userEvent.setup();

    const searchResults = [
      {
        worksheetId: 'sheet-1',
        name: 'Revenue',
        visibility: 'Visible' as const,
        isPinned: false,
        isGrouped: false,
        groupName: null,
      },
      {
        worksheetId: 'sheet-2',
        name: 'Forecast',
        visibility: 'Visible' as const,
        isPinned: false,
        isGrouped: false,
        groupName: null,
      },
      {
        worksheetId: 'sheet-3',
        name: 'Summary',
        visibility: 'Visible' as const,
        isPinned: false,
        isGrouped: false,
        groupName: null,
      },
    ];

    const { container } = render(
      <TaskpaneSections
        {...createBaseProps({
          query: 're',
          searchResults,
          navigatorView: {
            pinned: [],
            groups: [],
            ungrouped: [],
            hidden: [],
            searchResults,
          },
        })}
      />,
    );

    const searchInput = screen.getByRole('textbox', { name: 'Search worksheets' });
    searchInput.focus();

    await user.keyboard('{ArrowDown}');
    const revenueResult = screen.getByRole('button', { name: /Revenue/i });
    const forecastResult = screen.getByRole('button', { name: /Forecast/i });
    const summaryResult = screen.getByRole('button', { name: /Summary/i });

    const revenueItem = revenueResult.closest('[data-navigable-id="search:sheet-1"]');
    const forecastItem = forecastResult.closest('[data-navigable-id="search:sheet-2"]');
    const summaryItem = summaryResult.closest('[data-navigable-id="search:sheet-3"]');

    expect(revenueItem).toHaveAttribute('data-focused', 'true');

    // Pointer move should transfer active row to Forecast.
    fireEvent.mouseMove(forecastResult);
    expect(forecastItem).toHaveAttribute('data-focused', 'true');
    expect(forecastItem).toHaveAttribute('data-pointer-mode-active', 'true');
    expect(revenueItem).toHaveAttribute('data-focused', 'false');
    expect(container.querySelectorAll('.search-result[data-focused="true"]').length).toBe(1);

    // ArrowDown should continue from Forecast and move to Summary.
    await user.keyboard('{ArrowDown}');
    expect(summaryItem).toHaveAttribute('data-focused', 'true');
    expect(summaryItem).toHaveAttribute('data-pointer-mode-active', 'false');
    expect(forecastItem).toHaveAttribute('data-focused', 'false');
    expect(document.querySelector('.search-results-wrapper')?.getAttribute('data-navigation-input-mode')).toBe('keyboard');

    // Only one focused search result at any time.
    expect(container.querySelectorAll('.search-result[data-focused="true"]').length).toBe(1);
  });

  it('clears search and restores taskpane keyboard anchor on Escape from search result', async () => {
    const user = userEvent.setup();

    const searchResults = [
      {
        worksheetId: 'sheet-1',
        name: 'Revenue',
        visibility: 'Visible' as const,
        isPinned: false,
        isGrouped: false,
        groupName: null,
      },
      {
        worksheetId: 'sheet-2',
        name: 'Forecast',
        visibility: 'Visible' as const,
        isPinned: false,
        isGrouped: false,
        groupName: null,
      },
    ];

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [],
      ungrouped: [
        createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue' }),
        createWorksheet({ worksheetId: 'sheet-2', name: 'Forecast' }),
        createWorksheet({ worksheetId: 'sheet-3', name: 'Summary' }),
      ],
      hidden: [],
      searchResults,
    };

    render(
      <SearchQueryHarness
        {...createBaseProps({
          searchResults,
          navigatorView,
          activeWorksheetId: 'sheet-2',
        })}
      />,
    );

    const searchInput = screen.getByRole('textbox', { name: 'Search worksheets' });
    searchInput.focus();
    await user.keyboard('{ArrowDown}');

    const searchResultsPanel = document.querySelector('.search-results');
    expect(searchResultsPanel).toBeTruthy();
    const revenueResult = within(searchResultsPanel as HTMLElement).getByRole('button', { name: /Revenue/i });
    revenueResult.focus();
    await user.keyboard('{Escape}');

    // Search results dropdown should close after Escape.
    expect(document.querySelector('.search-results-wrapper .search-results')).toBeNull();

    // After leaving search mode, focus should restore to active worksheet row.
    const activeForecastRow = screen.getByRole('button', { name: 'Forecast' });
    expect(activeForecastRow).toHaveFocus();

    // Next arrow movement should continue from active worksheet (Forecast) -> Summary.
    await user.keyboard('{ArrowDown}');

    const summaryRow = screen.getByRole('button', { name: 'Summary' });
    expect(summaryRow.closest('[data-navigable-id="worksheet:sheet-3"]')).toHaveAttribute('data-visual-focused', 'true');
  });

  it('fades transient highlight out and returns active ghost after pointer idle clear', () => {
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
          activeWorksheetId: 'sheet-2',
        })}
      />,
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    const revenueArticle = revenueRow.closest('[data-navigable-id="worksheet:sheet-1"]');
    const forecastArticle = screen.getByRole('button', { name: 'Forecast' }).closest('[data-navigable-id="worksheet:sheet-2"]');

    fireEvent.pointerDown(revenueRow);

    expect(revenueArticle).toHaveAttribute('data-visual-focused', 'true');
    expect(forecastArticle).toHaveAttribute('data-active', 'true');
    expect(forecastArticle).toHaveAttribute('data-active-dimmed', 'true');

    act(() => {
      vi.advanceTimersByTime(TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS);
    });

    expect(container.querySelectorAll('[data-visual-focused="true"]').length).toBe(1);
    expect(revenueArticle).toHaveAttribute('data-visual-exiting', 'true');
    expect(forecastArticle).toHaveAttribute('data-visual-focused', 'true');

    act(() => {
      vi.advanceTimersByTime(HIGHLIGHT_EXIT_MS);
    });

    expect(revenueArticle).toHaveAttribute('data-visual-exiting', 'false');
  });

  it('pins context-menu highlight until menu closes, then restores keyboard anchor on that row', () => {
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

    const { rerender } = render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          activeWorksheetId: 'sheet-2',
          isContextMenuOpen: true,
          contextMenuOpenSheetId: 'sheet-1',
        })}
      />,
    );

    const revenueArticle = screen.getByRole('button', { name: 'Revenue' }).closest('[data-navigable-id="worksheet:sheet-1"]');
    const forecastArticle = screen.getByRole('button', { name: 'Forecast' }).closest('[data-navigable-id="worksheet:sheet-2"]');

    expect(revenueArticle).toHaveAttribute('data-visual-focused', 'true');

    act(() => {
      vi.advanceTimersByTime(TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS + HIGHLIGHT_EXIT_MS);
    });

    expect(revenueArticle).toHaveAttribute('data-visual-focused', 'true');

    rerender(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          activeWorksheetId: 'sheet-2',
          isContextMenuOpen: false,
        })}
      />,
    );

    // Closing the menu must keep logical + visual focus on the context row so arrow keys
    // do not fall through to the scrollable taskpane shell.
    expect(revenueArticle).toHaveAttribute('data-visual-focused', 'true');
    expect(revenueArticle).toHaveAttribute('data-visual-exiting', 'false');
    expect(revenueArticle).toHaveAttribute('data-focused', 'true');
    expect(forecastArticle).toHaveAttribute('data-active-dimmed', 'true');
  });

  it('applies visual highlight to group header on pointer selection', () => {
    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [
        {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'green',
          isCollapsed: false,
          worksheets: [createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue', groupId: 'group-1' })],
        },
      ],
      ungrouped: [],
      hidden: [],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
        })}
      />,
    );

    const groupButton = screen.getByRole('button', { name: 'Finance' });
    const groupHeader = groupButton.closest('[data-navigable-id="group-header:group-1"]');

    fireEvent.pointerDown(groupButton);

    expect(groupHeader).toHaveAttribute('data-visual-focused', 'true');
    expect(groupHeader).toHaveAttribute('data-focused', 'true');
  });

  it('pins visual highlight to group header while group menu is open', () => {
    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [
        {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'green',
          isCollapsed: false,
          worksheets: [createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue', groupId: 'group-1' })],
        },
      ],
      ungrouped: [],
      hidden: [],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          isContextMenuOpen: true,
          contextMenuOpenGroupId: 'group-1',
        })}
      />,
    );

    const groupHeader = screen.getByRole('button', { name: 'Finance' }).closest('[data-navigable-id="group-header:group-1"]');
    expect(groupHeader).toHaveAttribute('data-visual-focused', 'true');
  });

  it('returns visual highlight to collapsed active group header after transient clears', () => {
    vi.useFakeTimers();

    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [
        {
          groupId: 'group-1',
          name: 'Finance',
          colorToken: 'green',
          isCollapsed: true,
          worksheets: [createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue', groupId: 'group-1' })],
        },
      ],
      ungrouped: [createWorksheet({ worksheetId: 'sheet-2', name: 'Forecast' })],
      hidden: [],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          activeWorksheetId: 'sheet-1',
        })}
      />,
    );

    const forecastRow = screen.getByRole('button', { name: 'Forecast' });
    const groupHeader = screen.getByRole('button', { name: 'Finance' }).closest('[data-navigable-id="group-header:group-1"]');

    fireEvent.pointerDown(forecastRow);
    expect(forecastRow.closest('[data-navigable-id="worksheet:sheet-2"]')).toHaveAttribute('data-visual-focused', 'true');

    act(() => {
      vi.advanceTimersByTime(TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS);
    });

    expect(groupHeader).toHaveAttribute('data-visual-focused', 'true');
  });

  it('applies context-menu visual highlight to a hidden worksheet row', () => {
    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [],
      ungrouped: [createWorksheet({ worksheetId: 'vis-1', name: 'Visible' })],
      hidden: [
        createWorksheet({ worksheetId: 'hid-1', name: 'Archived', visibility: 'Hidden' }),
      ],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          navigatorView,
          isHiddenSectionCollapsed: false,
          isContextMenuOpen: true,
          contextMenuOpenSheetId: 'hid-1',
        })}
      />,
    );

    const hiddenRow = document.querySelector('.hidden-row');
    expect(hiddenRow).toBeTruthy();
    expect(hiddenRow).toHaveAttribute('data-visual-focused', 'true');
    expect(hiddenRow).toHaveAttribute('data-context-open', 'true');
    expect(hiddenRow).not.toHaveAttribute('data-navigable-id');
  });

  it('does not apply context-menu visual highlight while search is active (global policy)', () => {
    const navigatorView: NavigatorView = {
      pinned: [],
      groups: [],
      ungrouped: [],
      hidden: [
        createWorksheet({ worksheetId: 'hid-1', name: 'Archived', visibility: 'Hidden' }),
      ],
      searchResults: [],
    };

    render(
      <TaskpaneSections
        {...createBaseProps({
          query: 'a',
          navigatorView,
          isHiddenSectionCollapsed: false,
          isContextMenuOpen: true,
          contextMenuOpenSheetId: 'hid-1',
        })}
      />,
    );

    const hiddenRow = document.querySelector('.hidden-row');
    expect(hiddenRow).toBeTruthy();
    expect(hiddenRow).not.toHaveAttribute('data-visual-focused');
  });
});
