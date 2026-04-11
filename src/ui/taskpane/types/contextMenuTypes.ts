import type { WorksheetEntity } from '../../../domain/navigation/types';

// Shared context menu types keep components/hooks aligned on payload shape.

export interface SheetMenuState {
  kind: 'sheet';
  x: number;
  y: number;
  worksheet: WorksheetEntity;
}

export interface GroupMenuState {
  kind: 'group';
  x: number;
  y: number;
  groupId: string;
  groupName: string;
}

export type ContextMenuState = SheetMenuState | GroupMenuState;

export interface OpenSheetMenuArgs {
  target: HTMLElement;
  x: number;
  y: number;
  worksheet: WorksheetEntity;
}

export interface OpenGroupMenuArgs {
  target: HTMLElement;
  x: number;
  y: number;
  groupId: string;
  groupName: string;
}
