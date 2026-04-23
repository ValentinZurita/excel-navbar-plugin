import { act, fireEvent, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useKeyboardNavigation,
  type UseKeyboardNavigationArgs,
} from '../../src/application/navigation/useKeyboardNavigation';
import type { NavigableItem } from '../../src/domain/navigation/types';

function createArgs(
  items: NavigableItem[],
  overrides: Partial<UseKeyboardNavigationArgs> = {},
): UseKeyboardNavigationArgs {
  return {
    items,
    activeWorksheetId: items[0]?.kind === 'worksheet' ? (items[0].worksheetId ?? null) : null,
    onClearSearch: vi.fn(),
    onActivate: vi.fn(),
    onExpandGroup: vi.fn(),
    onCollapseGroup: vi.fn(),
    onFocusSearchInput: vi.fn(),
    searchInputRef: createRef<HTMLInputElement>(),
    isSearchActive: false,
    isDragActive: false,
    isDialogOpen: false,
    isRenaming: false,
    activeVisualItemId: items[0]?.id ?? null,
    isContextMenuOpen: false,
    contextMenuTargetItemId: null,
    ...overrides,
  };
}

describe('useKeyboardNavigation — DOM focus vs logical list focus', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('routes ArrowDown through list navigation when DOM focus is on a scrollable ancestor', () => {
    const items: NavigableItem[] = [
      { id: 'worksheet:a', kind: 'worksheet', worksheetId: 'a', name: 'A' },
      { id: 'worksheet:b', kind: 'worksheet', worksheetId: 'b', name: 'B' },
    ];

    const shell = document.createElement('main');
    shell.className = 'taskpane-shell';
    shell.tabIndex = -1;

    const rowA = document.createElement('article');
    const rowB = document.createElement('article');

    document.body.appendChild(shell);
    shell.appendChild(rowA);
    shell.appendChild(rowB);

    const { result } = renderHook(() => useKeyboardNavigation(createArgs(items)));

    act(() => {
      result.current.registerElement('worksheet:a', rowA);
      result.current.registerElement('worksheet:b', rowB);
      result.current.focusItem('worksheet:a');
    });

    act(() => {
      shell.focus();
    });
    expect(document.activeElement).toBe(shell);

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown', bubbles: true });
    });

    expect(result.current.focusedItemId).toBe('worksheet:b');
  });

  it('routes ArrowDown when DOM focus is on a nested button inside the logical row', () => {
    const items: NavigableItem[] = [
      { id: 'worksheet:a', kind: 'worksheet', worksheetId: 'a', name: 'A' },
      { id: 'worksheet:b', kind: 'worksheet', worksheetId: 'b', name: 'B' },
    ];

    const shell = document.createElement('main');
    const rowA = document.createElement('article');
    rowA.setAttribute('data-navigable-id', 'worksheet:a');
    const pin = document.createElement('button');
    pin.type = 'button';
    rowA.appendChild(pin);
    const rowB = document.createElement('article');

    document.body.appendChild(shell);
    shell.appendChild(rowA);
    shell.appendChild(rowB);

    const { result } = renderHook(() => useKeyboardNavigation(createArgs(items)));

    act(() => {
      result.current.registerElement('worksheet:a', rowA);
      result.current.registerElement('worksheet:b', rowB);
      result.current.focusItem('worksheet:a');
    });

    act(() => {
      pin.focus();
    });
    expect(document.activeElement).toBe(pin);

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown', bubbles: true });
    });

    expect(result.current.focusedItemId).toBe('worksheet:b');
  });

  it('routes ArrowDown from capture even when DOM focus is already on the logical row root', () => {
    const items: NavigableItem[] = [
      { id: 'worksheet:a', kind: 'hidden-worksheet', worksheetId: 'a', name: 'A' },
      { id: 'worksheet:b', kind: 'hidden-worksheet', worksheetId: 'b', name: 'B' },
    ];

    const rowA = document.createElement('article');
    rowA.setAttribute('data-navigable-id', 'worksheet:a');
    rowA.tabIndex = 0;
    const rowB = document.createElement('article');
    rowB.setAttribute('data-navigable-id', 'worksheet:b');
    rowB.tabIndex = -1;

    document.body.appendChild(rowA);
    document.body.appendChild(rowB);

    const { result } = renderHook(() => useKeyboardNavigation(createArgs(items)));

    act(() => {
      result.current.registerElement('worksheet:a', rowA);
      result.current.registerElement('worksheet:b', rowB);
      result.current.focusItem('worksheet:a');
    });

    act(() => {
      rowA.focus();
    });
    expect(document.activeElement).toBe(rowA);

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowDown', bubbles: true });
    });

    expect(result.current.focusedItemId).toBe('worksheet:b');
  });
});
