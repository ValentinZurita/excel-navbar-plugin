import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../../src/ui/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('runs confirmation through product-owned UI', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        title="Delete group"
        description="Delete Finance? Sheets will become ungrouped."
        confirmLabel="Delete group"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete group' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancels when escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        title="Delete group"
        confirmLabel="Delete group"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
