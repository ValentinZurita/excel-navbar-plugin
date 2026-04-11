import { render } from '@testing-library/react';
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
    expect(container.querySelector('.sheet-pin-button')).toBeInTheDocument();
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
    expect(container.querySelector('.sheet-pin-button')).toBeInTheDocument();
  });

  it('does not render a worksheet icon for pinned sheets', () => {
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
    expect(container.querySelector('.sheet-pin-button')).toBeInTheDocument();
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
  });
});
