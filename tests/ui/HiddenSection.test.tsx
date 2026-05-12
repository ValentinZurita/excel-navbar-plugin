import { fireEvent, render, screen } from '@testing-library/react';
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

  it('marks the row visually focused when visualFocusedItemId matches', () => {
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        visualFocusedItemId="worksheet:hidden-1"
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.hidden-row');
    expect(row).toHaveAttribute('data-visual-focused', 'true');
  });

  it('marks context-open and highlight when the sheet menu targets this row', () => {
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        contextMenuOpenSheetId="hidden-1"
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    const row = container.querySelector('.hidden-row');
    expect(row).toHaveAttribute('data-context-open', 'true');
    expect(row).toHaveAttribute('data-highlighted', 'true');
    expect(row?.classList.contains('sheet-row-context-open')).toBe(true);
  });

  it('sets data-navigable-id on hidden rows for shared keyboard navigation', () => {
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
      />,
    );

    expect(container.querySelector('.hidden-row')).toHaveAttribute(
      'data-navigable-id',
      'worksheet:hidden-1',
    );
  });

  it('suppresses Space key on hidden rows to prevent global DnD keyboard sensor activation', () => {
    const onItemKeyDown = vi.fn();
    const parentReactHandler = vi.fn();

    render(
      <div onKeyDown={parentReactHandler}>
        <HiddenSection
          isCollapsed={false}
          worksheets={[hiddenWorksheet()]}
          onToggle={vi.fn()}
          onUnhide={vi.fn()}
          onOpenContextMenu={vi.fn()}
          onItemKeyDown={onItemKeyDown}
        />
      </div>,
    );

    const row = screen.getByRole('button', { name: 'Archive' });
    const stopImmediatePropagationSpy = vi.spyOn(Event.prototype, 'stopImmediatePropagation');

    fireEvent.keyDown(row, { key: ' ' });

    expect(onItemKeyDown).not.toHaveBeenCalled();
    expect(parentReactHandler).not.toHaveBeenCalled();
    expect(stopImmediatePropagationSpy).toHaveBeenCalled();

    stopImmediatePropagationSpy.mockRestore();
  });

  it('does not suppress Space when it targets the nested unhide button', () => {
    const onItemKeyDown = vi.fn();
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
        onItemKeyDown={onItemKeyDown}
      />,
    );

    // Hover to reveal the unhide button
    const leading = container.querySelector('.sheet-row-leading');
    fireEvent.mouseEnter(leading!);

    const unhideButton = container.querySelector('.sheet-pin-button');
    expect(unhideButton).not.toBeNull();

    // Fire Space on the unhide button; the event bubbles to the row,
    // but hasNestedInteractiveTarget should return true for the button
    // so the row handler returns early and does not suppress Space.
    fireEvent.keyDown(unhideButton!, { key: ' ' });

    // onItemKeyDown should not be called because Space is not a managed nav key
    // and the nested interactive target check returns early.
    expect(onItemKeyDown).not.toHaveBeenCalled();
  });

  it('still allows Enter and arrow keys for keyboard navigation on hidden rows', () => {
    const onItemKeyDown = vi.fn();
    const { container } = render(
      <HiddenSection
        isCollapsed={false}
        worksheets={[hiddenWorksheet()]}
        onToggle={vi.fn()}
        onUnhide={vi.fn()}
        onOpenContextMenu={vi.fn()}
        onItemKeyDown={onItemKeyDown}
      />,
    );

    const row = container.querySelector('.hidden-row')!;

    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onItemKeyDown).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(row, { key: 'ArrowDown' });
    expect(onItemKeyDown).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(row, { key: 'ArrowUp' });
    expect(onItemKeyDown).toHaveBeenCalledTimes(3);
  });
});
