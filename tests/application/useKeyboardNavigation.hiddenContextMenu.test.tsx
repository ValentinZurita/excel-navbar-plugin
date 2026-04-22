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
    { id: 'worksheet:hidden-1', kind: 'hidden-worksheet', worksheetId: 'hidden-1', name: 'Hidden' },
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
    activeVisualItemId: 'worksheet:visible-1',
    isContextMenuOpen: false,
    contextMenuTargetItemId: null,
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

  it('restores keyboard row focus when the context menu closes', () => {
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

    expect(result.current.focusedItemId).toBe('worksheet:hidden-1');
    expect(result.current.navigationInputMode).toBe('keyboard');
  });

  it('does not set focus for hidden targets when the item is absent from the linear list', () => {
    const { result, rerender } = renderHook(
      (props: UseKeyboardNavigationArgs) => useKeyboardNavigation(props),
      {
        initialProps: createBaseArgs({
          items: [
            { id: 'worksheet:visible-1', kind: 'worksheet', worksheetId: 'visible-1', name: 'Visible' },
          ],
        }),
      },
    );

    act(() => {
      rerender(
        createBaseArgs({
          items: [
            { id: 'worksheet:visible-1', kind: 'worksheet', worksheetId: 'visible-1', name: 'Visible' },
          ],
          isContextMenuOpen: true,
          contextMenuTargetItemId: 'worksheet:hidden-1',
        }),
      );
    });

    expect(result.current.focusedItemId).toBeNull();
  });

  it('clears focus when hidden item disappears from the linear list while focus points at it', () => {
    const { result, rerender } = renderHook(
      (props: UseKeyboardNavigationArgs) => useKeyboardNavigation(props),
      {
        initialProps: createBaseArgs({
          isContextMenuOpen: true,
          contextMenuTargetItemId: 'worksheet:hidden-1',
        }),
      },
    );

    expect(result.current.focusedItemId).toBe('worksheet:hidden-1');

    act(() => {
      rerender(
        createBaseArgs({
          items: [
            { id: 'worksheet:visible-1', kind: 'worksheet', worksheetId: 'visible-1', name: 'Visible' },
          ],
          isContextMenuOpen: true,
          contextMenuTargetItemId: 'worksheet:hidden-1',
        }),
      );
    });

    expect(result.current.focusedItemId).toBeNull();
  });

  it('uses updated logical focus immediately when ArrowRight follows ArrowDown in same frame', () => {
    const onRequestSheetContextMenuFromKeyboard = vi.fn();

    const { result } = renderHook(
      (props: UseKeyboardNavigationArgs) => useKeyboardNavigation(props),
      {
        initialProps: createBaseArgs({
          items: [
            { id: 'worksheet:visible-1', kind: 'worksheet', worksheetId: 'visible-1', name: 'Visible' },
            { id: 'worksheet:hidden-1', kind: 'hidden-worksheet', worksheetId: 'hidden-1', name: 'Hidden' },
          ],
          onRequestSheetContextMenuFromKeyboard,
        }),
      },
    );

    const arrowDownEvent = {
      key: 'ArrowDown',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLElement>;

    const arrowRightEvent = {
      key: 'ArrowRight',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLElement>;

    act(() => {
      result.current.handleItemKeyDown(arrowDownEvent, 'worksheet:visible-1');
      result.current.handleItemKeyDown(arrowRightEvent, 'worksheet:visible-1');
    });

    expect(onRequestSheetContextMenuFromKeyboard).toHaveBeenCalledTimes(1);
    expect(onRequestSheetContextMenuFromKeyboard).toHaveBeenCalledWith({
      worksheetId: 'hidden-1',
      anchorElement: null,
    });
  });
});
