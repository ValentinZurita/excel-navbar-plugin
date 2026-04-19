import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    vi.useRealTimers();
  });

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
            projectedDropTarget: { containerId: 'group:group-1', index: 1, kind: 'gap' },
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

  it('triggers empty feedback animation on empty group click and clears it', () => {
    vi.useFakeTimers();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const onToggleCollapsed = vi.fn();
    const group = createGroup({ worksheets: [] });
    const { container } = render(
      <DndContext>
        <GroupCard
          group={group}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onToggleCollapsed={onToggleCollapsed}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finance' }));

    expect(onToggleCollapsed).toHaveBeenCalledWith('group-1');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container.querySelector('.group-empty-ghost')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(container.querySelector('.group-empty-ghost')).not.toBeInTheDocument();
    rafSpy.mockRestore();
  });

  it('does not trigger empty feedback for non-empty groups', () => {
    vi.useFakeTimers();
    const { container } = render(
      <DndContext>
        <GroupCard
          group={createGroup()}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finance' }));

    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(container.querySelector('.group-empty-ghost')).not.toBeInTheDocument();
  });

  it('does not trigger empty feedback while drag is active', () => {
    vi.useFakeTimers();
    const group = createGroup({ worksheets: [] });
    const { container } = render(
      <DndContext>
        <GroupCard
          group={group}
          activeWorksheetId={null}
          dragConfig={{
            projectedDropTarget: null,
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

    fireEvent.click(screen.getByRole('button', { name: 'Finance' }));

    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(container.querySelector('.group-empty-ghost')).not.toBeInTheDocument();
  });

  it('sets aria-expanded from group collapsed state', () => {
    const { rerender } = render(
      <DndContext>
        <GroupCard
          group={createGroup({ isCollapsed: false })}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    expect(screen.getByRole('button', { name: 'Finance' })).toHaveAttribute('aria-expanded', 'true');

    rerender(
      <DndContext>
        <GroupCard
          group={createGroup({ isCollapsed: true })}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    expect(screen.getByRole('button', { name: 'Finance' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('propagates keyboard navigation handlers to worksheets in expanded groups', () => {
    const onItemKeyDown = vi.fn();
    const registerElement = vi.fn();

    render(
      <DndContext>
        <GroupCard
          group={createGroup({ isCollapsed: false, worksheets: [createWorksheet({ worksheetId: 'sheet-1', name: 'Revenue' })] })}
          activeWorksheetId={null}
          focusedItemId={'worksheet:sheet-1'}
          onItemKeyDown={onItemKeyDown}
          registerElement={registerElement}
          onActivate={vi.fn()}
          onToggleCollapsed={vi.fn()}
          onOpenGroupMenu={vi.fn()}
          onOpenSheetMenu={vi.fn()}
        />
      </DndContext>,
    );

    const worksheetRow = screen.getByRole('button', { name: 'Revenue' });
    fireEvent.keyDown(worksheetRow, { key: 'ArrowDown' });

    expect(onItemKeyDown).toHaveBeenCalled();
    expect(registerElement).toHaveBeenCalledWith('worksheet:sheet-1', expect.any(HTMLElement));
  });
});
