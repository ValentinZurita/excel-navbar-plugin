import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchResults } from '../../src/ui/components/SearchResults';

describe('SearchResults', () => {
  it('renders group context and calls selection handler', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SearchResults
        results={[{ worksheetId: 'sheet-1', name: 'Revenue', visibility: 'Visible', isPinned: false, groupName: 'Finance' }]}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Finance')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Revenue/i }));
    expect(onSelect).toHaveBeenCalledWith('sheet-1');
  });
});
