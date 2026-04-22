import type { GroupColorToken, WorksheetEntity } from '../../../domain/navigation/types';

// Shared context menu types keep components/hooks aligned on payload shape.

export interface SheetMenuState {
  kind: 'sheet';
  x: number;
  y: number;
  worksheet: WorksheetEntity;
  /** How the menu was opened; keyboard opens skip same-sheet toggle and enable list focus. */
  openedVia?: 'pointer' | 'keyboard';
  /** Navigable row id that owns keyboard return focus when menu closes. */
  anchorNavigableId?: string | null;
}

export interface GroupMenuState {
  kind: 'group';
  x: number;
  y: number;
  groupId: string;
  groupName: string;
  colorToken: GroupColorToken;
}

export type ContextMenuState = SheetMenuState | GroupMenuState;

/** Inline confirmation after choosing Ungroup vs Delete group and sheets from the group context menu. */
export interface DeleteGroupRequest {
  groupId: string;
  groupName: string;
  mode: 'ungroup' | 'deleteSheets';
  /** Populated when `mode === 'deleteSheets'` (sheets in the group at request time). */
  sheetCount?: number;
}

export interface OpenSheetMenuArgs {
  target: HTMLElement;
  x: number;
  y: number;
  worksheet: WorksheetEntity;
  /** Default `pointer`: same-sheet pointer opens toggle closed. `keyboard` always opens. */
  interaction?: 'pointer' | 'keyboard';
}

export interface OpenGroupMenuArgs {
  target: HTMLElement;
  x: number;
  y: number;
  groupId: string;
  groupName: string;
  colorToken: GroupColorToken;
}
