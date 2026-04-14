import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineGroupCreator } from '../../src/ui/components/InlineGroupCreator';

describe('InlineGroupCreator', () => {
  it('renders input and color options', () => {
    render(
      <InlineGroupCreator
        onCreate={vi.fn()}
        onCancel={vi.fn()}
        onCloseMenu={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('placeholder');

    const colorContainer = screen.getByLabelText('Color options');
    const colorButtons = colorContainer.querySelectorAll('button');
    expect(colorButtons).toHaveLength(7);
  });

  it('focuses input on mount', async () => {
    render(
      <InlineGroupCreator
        onCreate={vi.fn()}
        onCancel={vi.fn()}
        onCloseMenu={vi.fn()}
        autoFocus={true}
      />,
    );

    // Wait for requestAnimationFrame to execute
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('does not focus input when autoFocus is false', () => {
    render(
      <InlineGroupCreator
        onCreate={vi.fn()}
        onCancel={vi.fn()}
        onCloseMenu={vi.fn()}
        autoFocus={false}
      />,
    );

    // Body should have focus, not the input
    expect(document.body).toHaveFocus();
  });

  it('calls onCreate with trimmed name on Enter', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <InlineGroupCreator
        onCreate={onCreate}
        onCancel={vi.fn()}
        onCloseMenu={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Name'), '  Finance  {Enter}');

    expect(onCreate).toHaveBeenCalledWith('Finance', 'none');
  });

  it('does not call onCreate on Enter with empty name', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <InlineGroupCreator
        onCreate={onCreate}
        onCancel={vi.fn()}
        onCloseMenu={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Name'), '{Enter}');

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('does not call onCreate on Enter with whitespace-only name', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <InlineGroupCreator
        onCreate={onCreate}
        onCancel={vi.fn()}
        onCloseMenu={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Name'), '   {Enter}');

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('does not call onCreate on Enter while IME composition is active', () => {
    const onCreate = vi.fn();

    render(
      <InlineGroupCreator
        onCreate={onCreate}
        onCancel={vi.fn()}
        onCloseMenu={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'Finance' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: true });

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('calls onCancel and onCloseMenu on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onCloseMenu = vi.fn();

    render(
      <InlineGroupCreator
        onCreate={vi.fn()}
        onCancel={onCancel}
        onCloseMenu={onCloseMenu}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
    expect(onCloseMenu).toHaveBeenCalled();
  });

  it('allows typing and modifying the name', async () => {
    const user = userEvent.setup();

    render(
      <InlineGroupCreator
        onCreate={vi.fn()}
        onCancel={vi.fn()}
        onCloseMenu={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Name');

    await user.type(input, 'Fin');
    expect(input).toHaveValue('Fin');

    await user.clear(input);
    await user.type(input, 'Operations');
    expect(input).toHaveValue('Operations');
  });
});
