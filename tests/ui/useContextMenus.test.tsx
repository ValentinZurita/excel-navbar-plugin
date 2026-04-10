import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import { useContextMenus } from '../../src/ui/taskpane/hooks/useContextMenus';

function createWorksheet(overrides: Partial<WorksheetEntity> = {}): WorksheetEntity {
  return {
    worksheetId: 'sheet-1',
    name: 'Revenue',
    visibility: 'Visible',
    workbookOrder: 1,
    isPinned: false,
    groupId: null,
    lastKnownStructuralState: null,
    ...overrides,
  };
}

describe('useContextMenus', () => {
  it('toggles sheet menu off when right-clicking the same worksheet again', () => {
    const { result } = renderHook(() => useContextMenus());
    const worksheet = createWorksheet();

    act(() => {
      result.current.openSheetMenu({
        target: document.body,
        x: 12,
        y: 24,
        worksheet,
      });
    });

    expect(result.current.sheetMenu?.worksheet.worksheetId).toBe('sheet-1');

    act(() => {
      result.current.openSheetMenu({
        target: document.body,
        x: 16,
        y: 28,
        worksheet,
      });
    });

    expect(result.current.sheetMenu).toBeNull();
  });

  it('keeps only one menu active at a time', () => {
    const { result } = renderHook(() => useContextMenus());
    const worksheet = createWorksheet();

    act(() => {
      result.current.openSheetMenu({
        target: document.body,
        x: 10,
        y: 10,
        worksheet,
      });
    });

    expect(result.current.sheetMenu).not.toBeNull();
    expect(result.current.groupMenu).toBeNull();

    act(() => {
      result.current.openGroupMenu({
        target: document.body,
        x: 20,
        y: 20,
        groupId: 'group-1',
        groupName: 'Finance',
      });
    });

    expect(result.current.sheetMenu).toBeNull();
    expect(result.current.groupMenu?.groupId).toBe('group-1');
  });
});
