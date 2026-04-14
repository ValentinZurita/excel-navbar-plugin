import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { SheetRow } from '../../src/ui/components/SheetRow';

const baseWorksheet: WorksheetEntity = {
  worksheetId: 'sheet-1',
  name: 'Revenue',
  visibility: 'Visible',
  workbookOrder: 1,
  isPinned: false,
  groupId: null,
  lastKnownStructuralState: null,
};

describe('SheetRow', () => {
  it('renders a worksheet icon for visible unpinned sheets', () => {
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    expect(container.querySelector('.sheet-row-icon')).toBeInTheDocument();
    expect(container.querySelector('.sheet-pin-button')).not.toBeInTheDocument();
    expect(container.querySelector('.sheet-row')).toHaveAttribute('data-leading-state', 'indicator');
  });

  it('renders a worksheet icon for visible unpinned sheets inside a group', () => {
    const worksheet = { ...baseWorksheet, groupId: 'group-1' };
    const { container } = render(
      <SheetRow
        worksheet={worksheet}
        isActive={false}
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    expect(container.querySelector('.sheet-row-icon')).toBeInTheDocument();
    expect(container.querySelector('.sheet-pin-button')).not.toBeInTheDocument();
    expect(container.querySelector('.sheet-row')).toHaveAttribute('data-leading-state', 'indicator');
  });

  it('renders a muted static pin indicator for pinned sheets', () => {
    const worksheet = { ...baseWorksheet, isPinned: true };
    const { container } = render(
      <SheetRow
        worksheet={worksheet}
        isActive={false}
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    expect(container.querySelector('.sheet-row-icon')).not.toBeInTheDocument();
    expect(container.querySelector('.sheet-pin-button')).not.toBeInTheDocument();
    expect(container.querySelector('.sheet-row-static-indicator')).toBeInTheDocument();
    expect(container.querySelector('.sheet-row')).toHaveAttribute('data-leading-state', 'pinned-indicator');
  });

  it('marks the row as highlighted and pin-visible when hover is controlled explicitly', () => {
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        isHovered
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-highlighted', 'true');
    expect(row).toHaveAttribute('data-pin-visible', 'true');
    expect(row).toHaveAttribute('data-leading-state', 'pin-action');
    expect(container.querySelector('.sheet-pin-button')).toBeInTheDocument();
  });

  it('suppresses transient hover visuals while drag interaction is active', () => {
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        isHovered
        isInteractionSuppressed
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-highlighted', 'false');
    expect(row).toHaveAttribute('data-pin-visible', 'false');
    expect(row).toHaveAttribute('data-leading-state', 'indicator');
  });

  it('keeps grouped worksheet rows in their base leading state while drag is active', () => {
    const worksheet = { ...baseWorksheet, groupId: 'group-1' };
    const { container } = render(
      <SheetRow
        worksheet={worksheet}
        isActive={false}
        isHovered
        isInteractionSuppressed
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'indicator');
    expect(container.querySelector('.sheet-row-icon')).toBeInTheDocument();
    expect(container.querySelector('.sheet-pin-button')).not.toBeInTheDocument();
  });

  it('keeps pinned rows visible as a muted indicator during drag suppression', () => {
    const worksheet = { ...baseWorksheet, isPinned: true };
    const { container } = render(
      <SheetRow
        worksheet={worksheet}
        isActive={false}
        isInteractionSuppressed
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'pinned-indicator');
    expect(container.querySelector('.sheet-row-static-indicator')).toBeInTheDocument();
  });

  it('keeps overlay styling independent from active worksheet state', () => {
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive
        isOverlay
        onActivate={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveClass('sheet-row-overlay');
    expect(row).toHaveClass('sheet-row-active');
    expect(row).toHaveAttribute('data-leading-state', 'indicator');
  });

  it('renders drag overlay rows as presentational only', () => {
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        isOverlay
        onActivate={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('tabindex', '-1');
    expect(row).toHaveAttribute('aria-hidden', 'true');
    expect(row).not.toHaveAttribute('role', 'button');
    expect(row).toHaveAttribute('data-leading-state', 'indicator');
  });

  it('does not activate when Space is pressed inside the inline rename input', () => {
    const onActivate = vi.fn();

    render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        isRenaming
        onActivate={onActivate}
        onOpenContextMenu={vi.fn()}
        onRenameSubmit={vi.fn()}
        onRenameCancel={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole('textbox'), { key: ' ' });

    expect(onActivate).not.toHaveBeenCalled();
  });

  it('respects container keydown prevention before running row activation shortcuts', () => {
    const onActivate = vi.fn();
    const onContainerKeyDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });

    render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        onActivate={onActivate}
        onOpenContextMenu={vi.fn()}
        containerProps={{ onKeyDown: onContainerKeyDown }}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Revenue' }), { key: ' ' });

    expect(onContainerKeyDown).toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
  });
});
