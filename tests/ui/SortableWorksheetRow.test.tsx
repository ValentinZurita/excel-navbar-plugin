import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { SortableWorksheetRow } from '../../src/ui/components/SortableWorksheetRow';

const useSortableMock = vi.fn();

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: (...args: unknown[]) => useSortableMock(...args),
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

describe('SortableWorksheetRow', () => {
  beforeEach(() => {
    useSortableMock.mockReturnValue({
      attributes: { 'data-sortable': 'true' },
      listeners: { onPointerDown: vi.fn() },
      setNodeRef: vi.fn(),
      isDragging: false,
    });
  });

  it('activates the worksheet when drag suppression is not needed', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(
      <SortableWorksheetRow
        worksheet={createWorksheet()}
        containerId="sheets"
        index={0}
        isActive={false}
        shouldSuppressActivation={() => false}
        onActivate={onActivate}
        onOpenContextMenu={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Revenue' }));

    expect(onActivate).toHaveBeenCalledWith('sheet-1');
  });

  it('does not activate while the row is dragging', async () => {
    useSortableMock.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      isDragging: true,
    });
    const user = userEvent.setup();
    const onActivate = vi.fn();

    render(
      <SortableWorksheetRow
        worksheet={createWorksheet()}
        containerId="sheets"
        index={0}
        isActive={false}
        shouldSuppressActivation={() => false}
        onActivate={onActivate}
        onOpenContextMenu={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Revenue' }));

    expect(onActivate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Revenue' })).toHaveClass('sheet-row-dragging');
  });

  it('does not activate when suppression says the click belongs to drag cleanup', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const shouldSuppressActivation = vi.fn(() => true);

    render(
      <SortableWorksheetRow
        worksheet={createWorksheet()}
        containerId="sheets"
        index={0}
        isActive={false}
        shouldSuppressActivation={shouldSuppressActivation}
        onActivate={onActivate}
        onOpenContextMenu={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Revenue' }));

    expect(shouldSuppressActivation).toHaveBeenCalledWith('sheet-1');
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('disables sortable listeners while a worksheet is being renamed inline', () => {
    const sortableKeydownListener = vi.fn();
    const onActivate = vi.fn();

    useSortableMock.mockReturnValue({
      attributes: { 'data-sortable': 'true' },
      listeners: { onPointerDown: vi.fn(), onKeyDown: sortableKeydownListener },
      setNodeRef: vi.fn(),
      isDragging: false,
    });

    render(
      <SortableWorksheetRow
        worksheet={createWorksheet()}
        containerId="sheets"
        index={0}
        isActive={false}
        isRenaming
        shouldSuppressActivation={() => false}
        onActivate={onActivate}
        onOpenContextMenu={vi.fn()}
        onRenameSubmit={vi.fn()}
        onRenameCancel={vi.fn()}
      />,
    );

    expect(useSortableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sheet-1',
        disabled: true,
      }),
    );

    fireEvent.keyDown(screen.getByRole('textbox'), { key: ' ' });

    expect(sortableKeydownListener).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
  });
});
