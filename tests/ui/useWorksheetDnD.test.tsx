import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { useWorksheetDnD } from '../../src/ui/taskpane/hooks/useWorksheetDnD';

function createWorksheet(overrides: Partial<WorksheetEntity> = {}): WorksheetEntity {
  return {
    worksheetId: 'sheet-1',
    name: 'Revenue',
    visibility: 'Visible',
    workbookOrder: 1,
    isPinned: false,
    groupId: 'group-1',
    lastKnownStructuralState: null,
    ...overrides,
  };
}

function createDragStartEvent(worksheetId = 'sheet-1', containerId = 'group:group-1', index = 0) {
  return {
    active: {
      data: {
        current: {
          type: 'worksheet',
          worksheetId,
          containerId,
          index,
        },
      },
    },
  } as any;
}

function createDropTargetEvent(
  containerId: 'sheets' | `group:${string}`,
  index: number,
  kind: 'row' | 'container-end' | 'group-header' = 'row',
  worksheetId = 'sheet-1',
  sourceContainerId: 'sheets' | `group:${string}` = 'sheets',
  sourceIndex = 0,
) {
  return {
    active: {
      data: {
        current: {
          type: 'worksheet',
          worksheetId,
          containerId: sourceContainerId,
          index: sourceIndex,
        },
      },
    },
    over: {
      data: {
        current: {
          type: 'worksheet-drop-target',
          containerId,
          index,
          kind,
        },
      },
    },
  } as any;
}

describe('useWorksheetDnD', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clears projected target when drag leaves all droppable zones', () => {
    const worksheet = createWorksheet();
    const { result } = renderHook(() =>
      useWorksheetDnD({
        assignWorksheetToGroup: vi.fn(),
        removeWorksheetFromGroup: vi.fn(),
        reorderGroupWorksheet: vi.fn(),
        reorderSheetSectionWorksheet: vi.fn(),
      }),
    );

    act(() => {
      result.current.onDragStart(createDragStartEvent(worksheet.worksheetId));
    });

    expect(result.current.projectedDropTarget).toEqual({
      containerId: 'group:group-1',
      index: 0,
      kind: 'row',
    });

    act(() => {
      result.current.onDragOver({ over: null } as any);
    });

    expect(result.current.projectedDropTarget).toBeNull();
  });

  it('uses the final drop event as the commit source even if projected state was cleared', () => {
    const worksheet = createWorksheet();
    const assignWorksheetToGroup = vi.fn();
    const { result } = renderHook(() =>
      useWorksheetDnD({
        assignWorksheetToGroup,
        removeWorksheetFromGroup: vi.fn(),
        reorderGroupWorksheet: vi.fn(),
        reorderSheetSectionWorksheet: vi.fn(),
      }),
    );

    act(() => {
      result.current.onDragStart(createDragStartEvent(worksheet.worksheetId, 'sheets', 0));
    });

    act(() => {
      result.current.onDragOver({ over: null } as any);
    });

    act(() => {
      result.current.onDragEnd(createDropTargetEvent('group:group-1', 0));
    });

    expect(assignWorksheetToGroup).toHaveBeenCalledWith('sheet-1', 'group-1', 0);
  });

  it('cleans up the flash timeout on unmount', () => {
    const worksheet = createWorksheet({ groupId: null });
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { result, unmount } = renderHook(() =>
      useWorksheetDnD({
        assignWorksheetToGroup: vi.fn(),
        removeWorksheetFromGroup: vi.fn(),
        reorderGroupWorksheet: vi.fn(),
        reorderSheetSectionWorksheet: vi.fn(),
      }),
    );

    act(() => {
      result.current.onDragStart(createDragStartEvent(worksheet.worksheetId, 'sheets', 0));
    });

    act(() => {
      result.current.onDragEnd(createDropTargetEvent('group:group-1', 0));
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    act(() => {
      vi.runAllTimers();
    });
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });
});
