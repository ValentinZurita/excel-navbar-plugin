import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('useWorksheetDnD', () => {
  it('clears projected target when drag leaves all droppable zones', () => {
    const worksheet = createWorksheet();
    const { result } = renderHook(() =>
      useWorksheetDnD({
        worksheetsById: { [worksheet.worksheetId]: worksheet },
        assignWorksheetToGroup: vi.fn(),
        removeWorksheetFromGroup: vi.fn(),
        reorderGroupWorksheet: vi.fn(),
        reorderSheetSectionWorksheet: vi.fn(),
      }),
    );

    act(() => {
      result.current.onDragStart({
        active: {
          data: {
            current: {
              type: 'worksheet',
              worksheetId: worksheet.worksheetId,
              containerId: 'group:group-1',
              index: 0,
            },
          },
        },
      } as any);
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
});
