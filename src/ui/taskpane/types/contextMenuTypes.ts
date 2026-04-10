import type { WorksheetEntity } from '../../../domain/navigation/types';

// Shared context menu types keep components/hooks aligned on payload shape.

export interface SheetMenuState {
  x: number;
  y: number;
  worksheet: WorksheetEntity;
}

export interface GroupMenuState {
  x: number;
  y: number;
  groupId: string;
  groupName: string;
}

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
