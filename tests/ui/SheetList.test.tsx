import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { DndContext } from '@dnd-kit/core';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { SheetList } from '../../src/ui/components/SheetList';

describe('SheetList', () => {
  it('does not render an empty drop zone for an empty group during drag', () => {
    render(
      <DndContext>
        <SheetList
          worksheets={[]}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onOpenContextMenu={vi.fn()}
          dragConfig={{
            containerId: 'group:group-1',
            projectedDropTarget: null,
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
        />
      </DndContext>,
    );

    expect(screen.queryByTestId('group:group-1-drop-end')).not.toBeInTheDocument();
  });

  it('renders a group end drop zone for a group with worksheets during drag', () => {
    render(
      <DndContext>
        <SheetList
          worksheets={[{ worksheetId: 'sheet-1', name: 'Revenue', visibility: 'Visible', workbookOrder: 1, isPinned: false, groupId: 'group-1', lastKnownStructuralState: null }]}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onOpenContextMenu={vi.fn()}
          dragConfig={{
            containerId: 'group:group-1',
            projectedDropTarget: null,
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
        />
      </DndContext>,
    );

    expect(screen.getByTestId('group:group-1-drop-end')).toBeInTheDocument();
  });

  it('still renders an empty drop zone for the top-level Sheets container during drag', () => {
    render(
      <DndContext>
        <SheetList
          worksheets={[]}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onOpenContextMenu={vi.fn()}
          dragConfig={{
            containerId: 'sheets',
            projectedDropTarget: null,
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
        />
      </DndContext>,
    );

    expect(screen.getByTestId('sheets-drop-end')).toBeInTheDocument();
  });

  it('adds drag-active class to the sheet list during active drag', () => {
    const { container } = render(
      <DndContext>
        <SheetList
          worksheets={[{ worksheetId: 'sheet-1', name: 'Revenue', visibility: 'Visible', workbookOrder: 1, isPinned: false, groupId: null, lastKnownStructuralState: null }]}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onOpenContextMenu={vi.fn()}
          dragConfig={{
            containerId: 'sheets',
            projectedDropTarget: null,
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
        />
      </DndContext>,
    );

    expect(container.querySelector('.sheet-list-drag-active')).toBeInTheDocument();
  });

  it('keeps dragged-list rows in their base leading state even if interaction suppressed', () => {
    render(
      <DndContext>
        <SheetList
          worksheets={[{ worksheetId: 'sheet-1', name: 'Revenue', visibility: 'Visible', workbookOrder: 1, isPinned: false, groupId: 'group-1', lastKnownStructuralState: null }]}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onOpenContextMenu={vi.fn()}
          onTogglePin={vi.fn()}
          dragConfig={{
            containerId: 'group:group-1',
            projectedDropTarget: null,
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
        />
      </DndContext>,
    );

    expect(screen.getByRole('button', { name: 'Revenue' })).toHaveAttribute('data-leading-state', 'indicator');
    expect(screen.getByRole('button', { name: 'Revenue' })).toHaveAttribute('data-pin-visible', 'false');
  });

  it('does not activate the end divider when projected target is the same-group header', () => {
    const worksheet: WorksheetEntity = {
      worksheetId: 'sheet-1',
      name: 'Revenue',
      visibility: 'Visible',
      workbookOrder: 1,
      isPinned: false,
      groupId: 'group-1',
      lastKnownStructuralState: null,
    };

    const { container } = render(
      <DndContext>
        <SheetList
          worksheets={[worksheet]}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onOpenContextMenu={vi.fn()}
          dragConfig={{
            containerId: 'group:group-1',
            projectedDropTarget: { containerId: 'group:group-1', index: 1, kind: 'group-header' },
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
        />
      </DndContext>,
    );

    const endDropZone = screen.getByTestId('group:group-1-drop-end');
    expect(endDropZone.querySelector('.worksheet-insertion-line-active')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="group:group-1-drop-gap-0"] .worksheet-insertion-line-active')).not.toBeInTheDocument();
  });

  it('activates gap insertion line for gap drop targets', () => {
    const worksheet: WorksheetEntity = {
      worksheetId: 'sheet-1',
      name: 'Revenue',
      visibility: 'Visible',
      workbookOrder: 1,
      isPinned: false,
      groupId: 'group-1',
      lastKnownStructuralState: null,
    };

    render(
      <DndContext>
        <SheetList
          worksheets={[worksheet]}
          activeWorksheetId={null}
          onActivate={vi.fn()}
          onOpenContextMenu={vi.fn()}
          dragConfig={{
            containerId: 'group:group-1',
            projectedDropTarget: { containerId: 'group:group-1', index: 0, kind: 'gap' },
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
        />
      </DndContext>,
    );

    const gapZone = screen.getByTestId('group:group-1-drop-gap-0');
    expect(gapZone.querySelector('.worksheet-insertion-line-active')).toBeInTheDocument();
  });

  it('does not track row hover state - pin only shows on leading area hover', async () => {
    const user = userEvent.setup();
    const worksheets: WorksheetEntity[] = [
      { worksheetId: 'sheet-1', name: 'Revenue', visibility: 'Visible', workbookOrder: 1, isPinned: false, groupId: null, lastKnownStructuralState: null },
      { worksheetId: 'sheet-2', name: 'Budget', visibility: 'Visible', workbookOrder: 2, isPinned: false, groupId: null, lastKnownStructuralState: null },
    ];

    render(
      <SheetList
        worksheets={worksheets}
        activeWorksheetId={null}
        onActivate={vi.fn()}
        onOpenContextMenu={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    const revenueRow = screen.getByRole('button', { name: 'Revenue' });
    const budgetRow = screen.getByRole('button', { name: 'Budget' });

    // Hover row - should NOT show pin (pin only shows on leading area hover)
    // The row hover tracking was removed as part of icon-only interaction refactor
    await user.hover(revenueRow);
    expect(revenueRow).toHaveAttribute('data-leading-state', 'indicator');
    expect(revenueRow).not.toHaveAttribute('data-hovered');

    await user.hover(budgetRow);
    expect(budgetRow).toHaveAttribute('data-leading-state', 'indicator');
    expect(budgetRow).not.toHaveAttribute('data-hovered');
  });
});
