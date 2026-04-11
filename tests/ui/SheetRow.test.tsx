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
});
