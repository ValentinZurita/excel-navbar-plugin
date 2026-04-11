import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
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

describe('TaskpaneSections', () => {
  it('renders a drag overlay for the active dragged worksheet', () => {
    const worksheet = createWorksheet();

    render(
      <TaskpaneSections
        query=""
        searchResults={[]}
        navigatorView={createNavigatorView()}
        activeWorksheetId={null}
        hoveredWorksheetId={null}
        isHiddenSectionCollapsed={false}
        dragConfig={{
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
        }}
        onChangeQuery={vi.fn()}
        onSelectSearchResult={vi.fn()}
        onActivateWorksheet={vi.fn()}
        onHoverWorksheet={vi.fn()}
        onPinWorksheet={vi.fn()}
        onUnpinWorksheet={vi.fn()}
        onToggleGroupCollapsed={vi.fn()}
        onToggleHiddenSection={vi.fn()}
        onUnhideWorksheet={vi.fn()}
        onOpenSheetMenu={vi.fn()}
        onOpenGroupMenu={vi.fn()}
      />,
    );

    const overlayRoot = screen.getByTestId('drag-overlay');
    expect(overlayRoot).toHaveClass('worksheet-drag-overlay');

    const overlayRows = overlayRoot.querySelectorAll('.sheet-row-overlay');
    expect(overlayRows).toHaveLength(1);
    expect(overlayRows[0]).toHaveAttribute('aria-label', 'Revenue');
  });
});
