import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { GroupCard } from '../../src/ui/components/GroupCard';
import type { NavigatorGroupView, WorksheetEntity } from '../../src/domain/navigation/types';

function createWorksheet(overrides: Partial<WorksheetEntity> = {}): WorksheetEntity {
  return {
    worksheetId: 'sheet-1',
    name: 'Revenue',
    visibility: 'Visible',
    workbookOrder: 1,
    isPinned: false,
    groupId: 'group-1',
    lastKnownStructuralState: null,
    ...overrides,
  };
}

function createGroup(overrides: Partial<NavigatorGroupView> = {}): NavigatorGroupView {
  return {
    groupId: 'group-1',
    name: 'Finance',
    colorToken: 'green',
    isCollapsed: false,
    worksheets: [createWorksheet()],
    ...overrides,
  };
}

describe('GroupCard', () => {
  it('opens only worksheet menu when right-clicking a worksheet row inside a group', () => {
    const onOpenGroupMenu = vi.fn();
    const onOpenSheetMenu = vi.fn();

    render(
      <DndContext>
        <GroupCard
          group={createGroup()}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={onOpenGroupMenu}
          onOpenSheetMenu={onOpenSheetMenu}
        />
      </DndContext>,
    );

    const worksheetButton = screen.getByRole('button', { name: 'Revenue' });
    const worksheetRow = worksheetButton.closest('article');

    expect(worksheetRow).not.toBeNull();
    fireEvent.contextMenu(worksheetRow as HTMLElement, { clientX: 120, clientY: 80 });

    expect(onOpenSheetMenu).toHaveBeenCalledTimes(1);
    expect(onOpenGroupMenu).not.toHaveBeenCalled();
  });

  it('activates the group header only for group-header targets in the same container', () => {
    const group = createGroup();
    const { container, rerender } = render(
      <DndContext>
        <GroupCard
          group={group}
          activeWorksheetId={null}
          dragConfig={{
            projectedDropTarget: { containerId: 'group:group-1', index: 1, kind: 'group-header' },
            flashedGroupId: null,
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    expect(container.querySelector('.group-header-drop-active')).toBeInTheDocument();

    rerender(
      <DndContext>
        <GroupCard
          group={group}
          activeWorksheetId={null}
          dragConfig={{
            projectedDropTarget: { containerId: 'group:group-1', index: 1, kind: 'row' },
            flashedGroupId: null,
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    expect(container.querySelector('.group-header-drop-active')).not.toBeInTheDocument();
  });

  it('passes drag config through to the inner sheet list for visible groups', () => {
    const group = createGroup({ worksheets: [] });
    render(
      <DndContext>
        <GroupCard
          group={group}
          activeWorksheetId={null}
          dragConfig={{
            projectedDropTarget: { containerId: 'group:group-1', index: 0, kind: 'container-end' },
            flashedGroupId: 'group-1',
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    expect(screen.queryByTestId('group:group-1-drop-end')).not.toBeInTheDocument();
    expect(document.querySelector('.group-leading-flash')).toBeInTheDocument();
  });

  it('renders group with none color token without background circle', () => {
    const group = createGroup({ colorToken: 'none' });

    render(
      <DndContext>
        <GroupCard
          group={group}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    const leading = document.querySelector('.group-leading-none');
    expect(leading).toBeInTheDocument();
  });
});
