import { act, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  useKeyboardNavigation,
  type UseKeyboardNavigationArgs,
} from '../../src/application/navigation/useKeyboardNavigation';
import type { NavigableItem } from '../../src/domain/navigation/types';

function createBaseArgs(overrides: Partial<UseKeyboardNavigationArgs> = {}): UseKeyboardNavigationArgs {
  const items: NavigableItem[] = [
    { id: 'worksheet:visible-1', kind: 'worksheet', worksheetId: 'visible-1', name: 'Visible' },
  ];
  return {
    items,
    activeWorksheetId: 'visible-1',
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
    isContextMenuOpen: false,
    contextMenuTargetItemId: null,
    hiddenWorksheetIds: ['hidden-1'],
    ...overrides,
  };
}

describe('useKeyboardNavigation — Hidden section context menu', () => {
  it('sets logical focus when the context menu targets a hidden worksheet', () => {
    const { result, rerender } = renderHook(
      (props: UseKeyboardNavigationArgs) => useKeyboardNavigation(props),
      { initialProps: createBaseArgs() },
    );

    expect(result.current.focusedItemId).toBeNull();

    act(() => {
      rerender(
        createBaseArgs({
          isContextMenuOpen: true,
          contextMenuTargetItemId: 'worksheet:hidden-1',
        }),
      );
    });

    expect(result.current.focusedItemId).toBe('worksheet:hidden-1');
    expect(result.current.navigationInputMode).toBe('pointer');
  });

  it('clears menu-owned focus when the context menu closes', () => {
    const { result, rerender } = renderHook(
      (props: UseKeyboardNavigationArgs) => useKeyboardNavigation(props),
      { initialProps: createBaseArgs() },
    );

    act(() => {
      rerender(
        createBaseArgs({
          isContextMenuOpen: true,
          contextMenuTargetItemId: 'worksheet:hidden-1',
        }),
      );
    });

    expect(result.current.focusedItemId).toBe('worksheet:hidden-1');

    act(() => {
      rerender(
        createBaseArgs({
          isContextMenuOpen: false,
          contextMenuTargetItemId: 'worksheet:hidden-1',
        }),
      );
    });

    expect(result.current.focusedItemId).toBeNull();
  });

  it('does not set focus for hidden targets when the id is not listed in hiddenWorksheetIds', () => {
    const { result, rerender } = renderHook(
      (props: UseKeyboardNavigationArgs) => useKeyboardNavigation(props),
      { initialProps: createBaseArgs({ hiddenWorksheetIds: [] }) },
    );

    act(() => {
      rerender(
        createBaseArgs({
          hiddenWorksheetIds: [],
          isContextMenuOpen: true,
          contextMenuTargetItemId: 'worksheet:hidden-1',
        }),
      );
    });

    expect(result.current.focusedItemId).toBeNull();
  });

  it('clears focus when the worksheet is no longer listed as hidden while focus points at it', () => {
    const { result, rerender } = renderHook(
      (props: UseKeyboardNavigationArgs) => useKeyboardNavigation(props),
      {
        initialProps: createBaseArgs({
          isContextMenuOpen: true,
          contextMenuTargetItemId: 'worksheet:hidden-1',
          hiddenWorksheetIds: ['hidden-1'],
        }),
      },
    );

    expect(result.current.focusedItemId).toBe('worksheet:hidden-1');

    act(() => {
      rerender(
        createBaseArgs({
          isContextMenuOpen: true,
          contextMenuTargetItemId: 'worksheet:hidden-1',
          hiddenWorksheetIds: [],
        }),
      );
    });

    expect(result.current.focusedItemId).toBeNull();
  });
});
