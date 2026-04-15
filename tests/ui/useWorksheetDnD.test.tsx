import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { pinnedSectionPolicy } from '../../src/ui/taskpane/dnd/dndPolicies';
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
  containerId: 'sheets' | 'pinned' | `group:${string}`,
  index: number,
  kind: 'row' | 'container-end' | 'group-header' = 'row',
  worksheetId = 'sheet-1',
  sourceContainerId: 'sheets' | 'pinned' | `group:${string}` = 'sheets',
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
        reorderPinnedWorksheet: vi.fn(),
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
        reorderPinnedWorksheet: vi.fn(),
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
        reorderPinnedWorksheet: vi.fn(),
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

  describe('policy validation in onDragOver', () => {
    it('suppresses visual feedback when policy prohibits the drop', () => {
      const pinnedWorksheet = createWorksheet({
        worksheetId: 'sheet-1',
        isPinned: true,
        groupId: null,
      });

      const { result } = renderHook(() =>
        useWorksheetDnD({
          assignWorksheetToGroup: vi.fn(),
          removeWorksheetFromGroup: vi.fn(),
          reorderGroupWorksheet: vi.fn(),
          reorderSheetSectionWorksheet: vi.fn(),
          reorderPinnedWorksheet: vi.fn(),
          policy: pinnedSectionPolicy,
          policyState: {
            worksheetsById: {
              [pinnedWorksheet.worksheetId]: pinnedWorksheet,
            },
          },
        }),
      );

      // Start dragging from pinned
      act(() => {
        result.current.onDragStart(
          createDragStartEvent(pinnedWorksheet.worksheetId, 'pinned', 0),
        );
      });

      expect(result.current.projectedDropTarget).toEqual({
        containerId: 'pinned',
        index: 0,
        kind: 'row',
      });

      // Try to drag over sheets section (should be prohibited by policy)
      act(() => {
        result.current.onDragOver(
          createDropTargetEvent('sheets', 0, 'row', pinnedWorksheet.worksheetId, 'pinned', 0),
        );
      });

      // Visual feedback should be suppressed
      expect(result.current.projectedDropTarget).toBeNull();
    });

    it('allows visual feedback when policy permits the drop', () => {
      const pinnedWorksheet = createWorksheet({
        worksheetId: 'sheet-1',
        isPinned: true,
        groupId: null,
      });

      const { result } = renderHook(() =>
        useWorksheetDnD({
          assignWorksheetToGroup: vi.fn(),
          removeWorksheetFromGroup: vi.fn(),
          reorderGroupWorksheet: vi.fn(),
          reorderSheetSectionWorksheet: vi.fn(),
          reorderPinnedWorksheet: vi.fn(),
          policy: pinnedSectionPolicy,
          policyState: {
            worksheetsById: {
              [pinnedWorksheet.worksheetId]: pinnedWorksheet,
            },
          },
        }),
      );

      // Start dragging from pinned
      act(() => {
        result.current.onDragStart(
          createDragStartEvent(pinnedWorksheet.worksheetId, 'pinned', 0),
        );
      });

      // Drag to another position within pinned (should be allowed)
      act(() => {
        result.current.onDragOver(
          createDropTargetEvent('pinned', 2, 'row', pinnedWorksheet.worksheetId, 'pinned', 0),
        );
      });

      // Visual feedback should be shown
      expect(result.current.projectedDropTarget).toEqual({
        containerId: 'pinned',
        index: 2,
        kind: 'row',
      });
    });

    it('shows visual feedback when dragging from sheets to group', () => {
      const worksheet = createWorksheet({
        worksheetId: 'sheet-1',
        isPinned: false,
        groupId: null,
      });

      const { result } = renderHook(() =>
        useWorksheetDnD({
          assignWorksheetToGroup: vi.fn(),
          removeWorksheetFromGroup: vi.fn(),
          reorderGroupWorksheet: vi.fn(),
          reorderSheetSectionWorksheet: vi.fn(),
          reorderPinnedWorksheet: vi.fn(),
          policy: pinnedSectionPolicy,
          policyState: {
            worksheetsById: {
              [worksheet.worksheetId]: worksheet,
            },
          },
        }),
      );

      // Start dragging from sheets
      act(() => {
        result.current.onDragStart(
          createDragStartEvent(worksheet.worksheetId, 'sheets', 0),
        );
      });

      // Drag to group (should be allowed by policy)
      act(() => {
        result.current.onDragOver(
          createDropTargetEvent('group:group-1', 0, 'row', worksheet.worksheetId, 'sheets', 0),
        );
      });

      // Visual feedback should be shown
      expect(result.current.projectedDropTarget).toEqual({
        containerId: 'group:group-1',
        index: 0,
        kind: 'row',
      });
    });

    it('suppresses feedback when dragging from sheets to pinned', () => {
      const worksheet = createWorksheet({
        worksheetId: 'sheet-1',
        isPinned: false,
        groupId: null,
      });

      const { result } = renderHook(() =>
        useWorksheetDnD({
          assignWorksheetToGroup: vi.fn(),
          removeWorksheetFromGroup: vi.fn(),
          reorderGroupWorksheet: vi.fn(),
          reorderSheetSectionWorksheet: vi.fn(),
          reorderPinnedWorksheet: vi.fn(),
          policy: pinnedSectionPolicy,
          policyState: {
            worksheetsById: {
              [worksheet.worksheetId]: worksheet,
            },
          },
        }),
      );

      // Start dragging from sheets
      act(() => {
        result.current.onDragStart(
          createDragStartEvent(worksheet.worksheetId, 'sheets', 0),
        );
      });

      // Try to drag to pinned (should be prohibited by policy)
      act(() => {
        result.current.onDragOver(
          createDropTargetEvent('pinned', 0, 'row', worksheet.worksheetId, 'sheets', 0),
        );
      });

      // Visual feedback should be suppressed
      expect(result.current.projectedDropTarget).toBeNull();
    });

    it('works without policy (backward compatibility)', () => {
      const worksheet = createWorksheet({
        worksheetId: 'sheet-1',
        isPinned: true,
        groupId: null,
      });

      const { result } = renderHook(() =>
        useWorksheetDnD({
          assignWorksheetToGroup: vi.fn(),
          removeWorksheetFromGroup: vi.fn(),
          reorderGroupWorksheet: vi.fn(),
          reorderSheetSectionWorksheet: vi.fn(),
          reorderPinnedWorksheet: vi.fn(),
          // No policy provided
        }),
      );

      // Start dragging
      act(() => {
        result.current.onDragStart(
          createDragStartEvent(worksheet.worksheetId, 'pinned', 0),
        );
      });

      // Drag anywhere - should show feedback since no policy restricts it
      act(() => {
        result.current.onDragOver(
          createDropTargetEvent('sheets', 0, 'row', worksheet.worksheetId, 'pinned', 0),
        );
      });

      // Visual feedback should be shown (no policy to restrict)
      expect(result.current.projectedDropTarget).toEqual({
        containerId: 'sheets',
        index: 0,
        kind: 'row',
      });
    });
  });
});
