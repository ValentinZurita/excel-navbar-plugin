import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DndContext } from '@dnd-kit/core';
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

  it('does not render a group end drop zone for a group with worksheets during drag', () => {
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

    expect(screen.queryByTestId('group:group-1-drop-end')).not.toBeInTheDocument();
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
});
