import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { HiddenSection } from '../../src/ui/components/HiddenSection';

function hiddenWorksheet(overrides: Partial<WorksheetEntity> = {}): WorksheetEntity {
  return {
    worksheetId: 'hidden-1',
    name: 'Archive',
    visibility: 'Hidden',
    workbookOrder: 9,
    isPinned: false,
    groupId: null,
    lastKnownStructuralState: null,
    ...overrides,
  };
}

function isUnhideButtonVisible(container: HTMLElement): boolean {
  const button = container.querySelector('.sheet-pin-button');
  if (!button) return false;
  return button.classList.contains('sheet-pin-button-visible');
}

describe('HiddenSection', () => {
  it('shows unhide overlay when hovering the leading cluster for a Hidden sheet', async () => {
    const user = userEvent.setup();
    const onUnhide = vi.fn();
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        onToggle={vi.fn()}
        onUnhide={onUnhide}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.hidden-row');
    expect(row).toHaveAttribute('data-unhide-interacting', 'false');
    expect(isUnhideButtonVisible(container)).toBe(false);

    const leading = container.querySelector('.sheet-row-leading');
    expect(leading).toBeTruthy();
    await user.hover(leading!);

    expect(row).toHaveAttribute('data-unhide-interacting', 'true');
    expect(isUnhideButtonVisible(container)).toBe(true);
    expect(screen.getByRole('button', { name: 'Unhide Archive' })).toBeInTheDocument();
  });

  it('keeps unhide overlay when moving pointer from leading span to the overlay button', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.hidden-row');
    const leading = container.querySelector('.sheet-row-leading');
    await user.hover(leading!);
    expect(row).toHaveAttribute('data-unhide-interacting', 'true');

    const button = container.querySelector('.sheet-pin-button');
    expect(button).toBeTruthy();
    await user.hover(button!);
    expect(row).toHaveAttribute('data-unhide-interacting', 'true');
    expect(isUnhideButtonVisible(container)).toBe(true);
  });

  it('returns to idle when leaving the leading cluster for the sheet title', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.hidden-row');
    const leading = container.querySelector('.sheet-row-leading');
    await user.hover(leading!);
    expect(row).toHaveAttribute('data-unhide-interacting', 'true');

    const title = container.querySelector('.sheet-title');
    expect(title).toBeTruthy();
    await user.hover(title!);
    expect(row).toHaveAttribute('data-unhide-interacting', 'false');
    expect(isUnhideButtonVisible(container)).toBe(false);
  });

  it('calls onUnhide when the overlay button is clicked', async () => {
    const user = userEvent.setup();
    const onUnhide = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        onToggle={vi.fn()}
        onUnhide={onUnhide}
        onOpenContextMenu={vi.fn()}
      />,
    );

    await user.hover(container.querySelector('.sheet-row-leading')!);
    await user.click(screen.getByRole('button', { name: 'Unhide Archive' }));
    expect(onUnhide).toHaveBeenCalledWith('hidden-1');
  });

  it('does not render unhide button for VeryHidden sheets and exposes a title hint', () => {
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet({ visibility: 'VeryHidden', name: 'Secret' })]}
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    expect(container.querySelector('.sheet-pin-button')).toBeNull();
    const row = container.querySelector('.hidden-row');
    expect(row).toHaveAttribute('title', 'Cannot unhide Very Hidden sheet');
    expect(row).toHaveAttribute('data-unhide-interacting', 'false');
  });

  it('renders nothing in the body when collapsed', () => {
    const { container } = render(
      <HiddenSection
        isCollapsed
        worksheets={[hiddenWorksheet()]}
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    expect(container.querySelector('.sheet-list.section-body')).toBeNull();
  });
});
