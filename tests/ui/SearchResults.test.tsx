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
        results={[{ worksheetId: 'sheet-1', name: 'Revenue', visibility: 'Visible', isPinned: false, isGrouped: true, groupName: 'Finance' }]}
        onSelect={onSelect}
        focusedItemId={null}
      />,
    );

    expect(screen.getByText('Finance')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Revenue/i }));
    expect(onSelect).toHaveBeenCalledWith('sheet-1');
  });

  it('uses folder icon for grouped visible results', () => {
    const { container } = render(
      <SearchResults
        results={[{ worksheetId: 'sheet-1', name: 'Revenue', visibility: 'Visible', isPinned: false, isGrouped: true, groupName: 'Finance' }]}
        onSelect={() => undefined}
        focusedItemId={null}
      />,
    );

    expect(container.querySelector('.search-result-icon-group')).toBeTruthy();
  });

  it('uses pinned icon for pinned ungrouped results', () => {
    const { container } = render(
      <SearchResults
        results={[{ worksheetId: 'sheet-2', name: 'Overview', visibility: 'Visible', isPinned: true, isGrouped: false, groupName: null }]}
        onSelect={() => undefined}
        focusedItemId={null}
      />,
    );

    expect(container.querySelector('.search-result-icon-pinned')).toBeTruthy();
  });

  it('uses worksheet icon for regular visible results', () => {
    const { container } = render(
      <SearchResults
        results={[{ worksheetId: 'sheet-3', name: 'Inputs', visibility: 'Visible', isPinned: false, isGrouped: false, groupName: null }]}
        onSelect={() => undefined}
        focusedItemId={null}
      />,
    );

    expect(container.querySelector('.search-result-icon-worksheet')).toBeTruthy();
  });

  it('marks the active worksheet row for styling', () => {
    render(
      <SearchResults
        results={[
          { worksheetId: 'sheet-a', name: 'Draft', visibility: 'Visible', isPinned: false, isGrouped: false, groupName: null },
          { worksheetId: 'sheet-b', name: 'Live', visibility: 'Visible', isPinned: false, isGrouped: false, groupName: null },
        ]}
        onSelect={() => undefined}
        activeWorksheetId="sheet-b"
        focusedItemId={null}
      />,
    );

    const live = screen.getByRole('button', { name: /Live/i });
    const draft = screen.getByRole('button', { name: /Draft/i });
    expect(live).toHaveAttribute('data-active-worksheet', 'true');
    expect(draft).not.toHaveAttribute('data-active-worksheet');
  });

  it('uses hidden icon with highest priority', () => {
    const { container } = render(
      <SearchResults
        results={[
          {
            worksheetId: 'sheet-4',
            name: 'Archive',
            visibility: 'Hidden',
            isPinned: true,
            isGrouped: true,
            groupName: 'Finance',
          },
        ]}
        onSelect={() => undefined}
        focusedItemId={null}
      />,
    );

    expect(container.querySelector('.search-result-icon-hidden')).toBeTruthy();
  });
});
