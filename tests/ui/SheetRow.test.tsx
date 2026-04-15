import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/**
 * Helper to check if pin button is visually visible
 * The button is always in DOM now (for smooth interactions), so we check CSS classes
 */
function isPinButtonVisible(container: HTMLElement): boolean {
  const button = container.querySelector('.sheet-pin-button');
  if (!button) return false;
  return button.classList.contains('sheet-pin-button-visible');
}

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
    expect(container.querySelector('.sheet-row')).toHaveAttribute('data-leading-state', 'indicator');
    // Pin button exists in DOM but is not visible
    expect(container.querySelector('.sheet-pin-button')).toBeInTheDocument();
    expect(isPinButtonVisible(container)).toBe(false);
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
    expect(container.querySelector('.sheet-row')).toHaveAttribute('data-leading-state', 'indicator');
    expect(isPinButtonVisible(container)).toBe(false);
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
    expect(container.querySelector('.sheet-row-static-indicator')).toBeInTheDocument();
    expect(container.querySelector('.sheet-row')).toHaveAttribute('data-leading-state', 'pinned-indicator');
    // Pin button exists but shows as "Pin" (not unpin) when not hovered
    const button = container.querySelector('.sheet-pin-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Pin Revenue');
    expect(isPinButtonVisible(container)).toBe(false);
  });

  it('shows pin button when hovering the leading icon area (not the row)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    // Initially pin button not visible
    expect(isPinButtonVisible(container)).toBe(false);
    expect(container.querySelector('.sheet-row')).toHaveAttribute('data-leading-state', 'indicator');

    // Hover the leading area
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    // Now pin button should be visible
    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'pin-action');
    expect(row).toHaveAttribute('data-pin-visible', 'true');
    expect(isPinButtonVisible(container)).toBe(true);
    
    const button = container.querySelector('.sheet-pin-button');
    expect(button).toHaveAttribute('aria-label', 'Pin Revenue');
  });

  it('shows unpin button when hovering the leading icon area on pinned sheets', async () => {
    const user = userEvent.setup();
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

    // Initially shows static pin indicator
    expect(container.querySelector('.sheet-row-static-indicator')).toBeInTheDocument();
    expect(isPinButtonVisible(container)).toBe(false);

    // Hover the leading area
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    // Now unpin button should be visible
    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'unpin-action');
    expect(row).toHaveAttribute('data-pin-visible', 'true');
    expect(isPinButtonVisible(container)).toBe(true);

    const button = container.querySelector('.sheet-pin-button');
    expect(button).toHaveClass('sheet-pin-button-active');
    expect(button).toHaveAttribute('aria-label', 'Unpin Revenue');
  });

  it('keeps unpin button stable when moving pointer from leading area to button on pinned sheets', async () => {
    const user = userEvent.setup();
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

    // Hover leading area to reveal button
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'unpin-action');

    // Move pointer to the button itself - state should remain stable
    const button = container.querySelector('.sheet-pin-button');
    await user.hover(button!);

    // Should still be unpin-action, not flicker back to pinned-indicator
    expect(row).toHaveAttribute('data-leading-state', 'unpin-action');
    expect(isPinButtonVisible(container)).toBe(true);
  });

  it('maintains unpin button stable on active pinned sheets', async () => {
    const user = userEvent.setup();
    const worksheet = { ...baseWorksheet, isPinned: true };
    const { container } = render(
      <SheetRow
        worksheet={worksheet}
        isActive={true}
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    // Active pinned row should show unpin button on leading hover
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'unpin-action');
    expect(row).toHaveAttribute('data-pin-visible', 'true');

    // Move to button - should stay stable
    const button = container.querySelector('.sheet-pin-button');
    await user.hover(button!);
    expect(row).toHaveAttribute('data-leading-state', 'unpin-action');
  });

  it('returns to pinned-indicator when leaving the leading cluster entirely', async () => {
    const user = userEvent.setup();
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

    // Hover leading area
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'unpin-action');

    // Leave the leading area entirely - should return to pinned-indicator
    const sheetTitle = container.querySelector('.sheet-title');
    await user.hover(sheetTitle!);

    expect(row).toHaveAttribute('data-leading-state', 'pinned-indicator');
    expect(isPinButtonVisible(container)).toBe(false);
  });

  it('never renders worksheet icon in base indicator for pinned rows during hover', async () => {
    const user = userEvent.setup();
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

    // Initially shows pinned indicator
    expect(container.querySelector('.sheet-row-static-indicator')).toBeInTheDocument();
    expect(container.querySelector('.sheet-row-icon')).not.toBeInTheDocument();

    // Hover leading area to trigger unpin action
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'unpin-action');

    // Critical: base indicator should still contain pin icon, never worksheet icon
    // This prevents the flash during transition
    const baseIndicator = container.querySelector('.sheet-row-base-indicator');
    expect(baseIndicator?.querySelector('.sheet-row-static-indicator')).toBeInTheDocument();
    expect(baseIndicator?.querySelector('.sheet-row-icon')).not.toBeInTheDocument();
  });

  it('does NOT show pin button when hovering the row title (only leading area)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    // Hover the row itself (the article/role=button)
    const rowButton = screen.getByRole('button', { name: 'Revenue' });
    await user.hover(rowButton);

    // Pin button should NOT be visible
    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'indicator');
    expect(isPinButtonVisible(container)).toBe(false);
  });

  it('calls onTogglePin when clicking unpin button on pinned sheet', async () => {
    const user = userEvent.setup();
    const worksheet = { ...baseWorksheet, isPinned: true };
    const onTogglePin = vi.fn();
    const { container } = render(
      <SheetRow
        worksheet={worksheet}
        isActive={false}
        onActivate={vi.fn()}
        onTogglePin={onTogglePin}
        onOpenContextMenu={vi.fn()}
      />,
    );

    // Hover leading area to reveal button
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    const button = container.querySelector('.sheet-pin-button');
    expect(isPinButtonVisible(container)).toBe(true);

    await user.click(button!);

    expect(onTogglePin).toHaveBeenCalledWith('sheet-1');
  });

  it('calls onTogglePin when clicking pin button on unpinned sheet', async () => {
    const user = userEvent.setup();
    const onTogglePin = vi.fn();
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        onActivate={vi.fn()}
        onTogglePin={onTogglePin}
        onOpenContextMenu={vi.fn()}
      />,
    );

    // Hover leading area to reveal button
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    const button = container.querySelector('.sheet-pin-button');
    expect(isPinButtonVisible(container)).toBe(true);
    expect(button).toHaveAttribute('aria-label', 'Pin Revenue');

    await user.click(button!);

    expect(onTogglePin).toHaveBeenCalledWith('sheet-1');
  });

  it('shows pin action when context menu is open (discoverability)', () => {
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        isContextMenuOpen
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-context-open', 'true');
    expect(row).toHaveAttribute('data-leading-state', 'pin-action');
    expect(row).toHaveAttribute('data-pin-visible', 'true');
    expect(isPinButtonVisible(container)).toBe(true);
  });

  it('suppresses pin action while drag interaction is active', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        isInteractionSuppressed
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    // Even when hovering leading area, action should not show
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-highlighted', 'false');
    expect(row).toHaveAttribute('data-pin-visible', 'false');
    expect(row).toHaveAttribute('data-leading-state', 'indicator');
    expect(isPinButtonVisible(container)).toBe(false);
  });

  it('keeps grouped worksheet rows in their base leading state while drag is active', async () => {
    const user = userEvent.setup();
    const worksheet = { ...baseWorksheet, groupId: 'group-1' };
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
    expect(row).toHaveAttribute('data-leading-state', 'indicator');
    expect(container.querySelector('.sheet-row-icon')).toBeInTheDocument();
    expect(isPinButtonVisible(container)).toBe(false);

    // Try hovering leading area during suppression
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    // Should still be suppressed
    expect(row).toHaveAttribute('data-leading-state', 'indicator');
    expect(isPinButtonVisible(container)).toBe(false);
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
    expect(isPinButtonVisible(container)).toBe(false);
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
    expect(isPinButtonVisible(container)).toBe(false);
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
    expect(isPinButtonVisible(container)).toBe(false);
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

  it('shows pin button when leading button receives keyboard focus', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SheetRow
        worksheet={baseWorksheet}
        isActive={false}
        onActivate={vi.fn()}
        onTogglePin={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    // Initially pin button not visible
    expect(isPinButtonVisible(container)).toBe(false);

    // Hover to reveal button first (so we can focus it)
    const leadingArea = container.querySelector('.sheet-row-leading');
    await user.hover(leadingArea!);

    const button = container.querySelector('.sheet-pin-button');
    expect(isPinButtonVisible(container)).toBe(true);

    // Focus the button
    await user.click(button!); // Click also focuses

    const row = container.querySelector('.sheet-row');
    expect(row).toHaveAttribute('data-leading-state', 'pin-action');
  });
});
