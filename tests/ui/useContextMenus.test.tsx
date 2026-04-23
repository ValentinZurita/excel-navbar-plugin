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

    expect(result.current.activeMenu?.kind).toBe('sheet');
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

  it('keeps sheet menu open when right-clicking same worksheet from different row anchors', () => {
    const { result } = renderHook(() => useContextMenus());
    const worksheet = createWorksheet();

    const searchRow = document.createElement('button');
    searchRow.setAttribute('data-navigable-id', 'search:sheet-1');

    const sheetRow = document.createElement('button');
    sheetRow.setAttribute('data-navigable-id', 'worksheet:sheet-1');

    act(() => {
      result.current.openSheetMenu({
        target: searchRow,
        x: 12,
        y: 24,
        worksheet,
      });
    });

    expect(result.current.sheetMenu?.anchorNavigableId).toBe('search:sheet-1');

    act(() => {
      result.current.openSheetMenu({
        target: sheetRow,
        x: 16,
        y: 28,
        worksheet,
      });
    });

    expect(result.current.sheetMenu).not.toBeNull();
    expect(result.current.sheetMenu?.anchorNavigableId).toBe('worksheet:sheet-1');
    expect(result.current.sheetMenu?.x).toBe(16);
    expect(result.current.sheetMenu?.y).toBe(28);
  });

  it('keeps the sheet menu open when opening the same worksheet via keyboard twice', () => {
    const { result } = renderHook(() => useContextMenus());
    const worksheet = createWorksheet();

    act(() => {
      result.current.openSheetMenu({
        target: document.body,
        x: 12,
        y: 24,
        worksheet,
        interaction: 'keyboard',
      });
    });

    expect(result.current.sheetMenu?.worksheet.worksheetId).toBe('sheet-1');
    expect(result.current.sheetMenu?.openedVia).toBe('keyboard');

    act(() => {
      result.current.openSheetMenu({
        target: document.body,
        x: 20,
        y: 30,
        worksheet,
        interaction: 'keyboard',
      });
    });

    expect(result.current.sheetMenu).not.toBeNull();
    expect(result.current.sheetMenu?.x).toBe(20);
    expect(result.current.sheetMenu?.y).toBe(30);
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

    expect(result.current.activeMenu?.kind).toBe('sheet');
    expect(result.current.sheetMenu).not.toBeNull();
    expect(result.current.groupMenu).toBeNull();

    act(() => {
      result.current.openGroupMenu({
        target: document.body,
        x: 20,
        y: 20,
        groupId: 'group-1',
        groupName: 'Finance',
        colorToken: 'blue',
      });
    });

    expect(result.current.activeMenu?.kind).toBe('group');
    expect(result.current.sheetMenu).toBeNull();
    expect(result.current.groupMenu?.groupId).toBe('group-1');
  });

  it('toggles group menu off when right-clicking same group again', () => {
    const { result } = renderHook(() => useContextMenus());

    act(() => {
      result.current.openGroupMenu({
        target: document.body,
        x: 20,
        y: 20,
        groupId: 'group-1',
        groupName: 'Finance',
        colorToken: 'blue',
      });
    });

    expect(result.current.groupMenu?.groupId).toBe('group-1');

    act(() => {
      result.current.openGroupMenu({
        target: document.body,
        x: 26,
        y: 24,
        groupId: 'group-1',
        groupName: 'Finance',
        colorToken: 'blue',
      });
    });

    expect(result.current.groupMenu).toBeNull();
  });
});
