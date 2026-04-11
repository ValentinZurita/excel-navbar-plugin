import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
            activeWorksheet: worksheet,
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
    expect(container.querySelector('.row-insertion-line.worksheet-insertion-line-active')).not.toBeInTheDocument();
  });

  it('keeps same-group row insertion line for regular row targets', () => {
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
            activeWorksheet: worksheet,
            containerId: 'group:group-1',
            projectedDropTarget: { containerId: 'group:group-1', index: 0, kind: 'row' },
            isDragActive: true,
            shouldSuppressActivation: () => false,
          }}
        />
      </DndContext>,
    );

    expect(container.querySelector('.row-insertion-line.worksheet-insertion-line-active')).toBeInTheDocument();
  });
});
