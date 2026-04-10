import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextPromptDialog } from '../../src/ui/components/TextPromptDialog';

describe('TextPromptDialog', () => {
  it('submits a trimmed value through product-owned UI', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <TextPromptDialog
        isOpen
        title="Rename sheet"
        initialValue="  Revenue  "
        submitLabel="Save name"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(onSubmit).toHaveBeenCalledWith('Revenue');
  });

  it('cancels when escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <TextPromptDialog
        isOpen
        title="New group"
        initialValue=""
        submitLabel="Create group"
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
