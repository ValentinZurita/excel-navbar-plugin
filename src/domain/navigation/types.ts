export type WorksheetVisibility = 'Visible' | 'Hidden' | 'VeryHidden';

export type GroupColorToken =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'gray';

export interface WorksheetEntity {
  worksheetId: string;
  name: string;
  visibility: WorksheetVisibility;
  workbookOrder: number;
  isPinned: boolean;
  groupId: string | null;
  lastKnownStructuralState: StructuralState | null;
}

export interface GroupEntity {
  groupId: string;
  name: string;
  colorToken: GroupColorToken;
  isCollapsed: boolean;
  worksheetOrder: string[];
  createdAt: number;
}

export type StructuralState =
  | { kind: 'pinned' }
  | { kind: 'group'; groupId: string }
  | { kind: 'ungrouped' };

export interface WorkbookSnapshot {
  worksheets: Array<Pick<WorksheetEntity, 'worksheetId' | 'name' | 'visibility' | 'workbookOrder'>>;
  activeWorksheetId: string | null;
}

export interface PersistedNavigationModel {
  metadataVersion: 1;
  groups: GroupEntity[];
  sheetSectionOrder: string[];
  pinnedWorksheetIds: string[];
  hiddenSectionCollapsed: boolean;
  priorStructuralStateByWorksheetId: Record<string, StructuralState | null>;
}

export interface NavigationState {
  worksheetsById: Record<string, WorksheetEntity>;
  groupsById: Record<string, GroupEntity>;
  groupOrder: string[];
  sheetSectionOrder: string[];
  hiddenSectionCollapsed: boolean;
  query: string;
  activeWorksheetId: string | null;
  lastSyncAt: number | null;
  isReady: boolean;
}

export interface SearchResultItem {
  worksheetId: string;
  name: string;
  visibility: WorksheetVisibility;
  isPinned: boolean;
  groupName: string | null;
}

export interface NavigatorGroupView {
  groupId: string;
  name: string;
  colorToken: GroupColorToken;
  isCollapsed: boolean;
  worksheets: WorksheetEntity[];
}

export interface NavigatorView {
  pinned: WorksheetEntity[];
  groups: NavigatorGroupView[];
  ungrouped: WorksheetEntity[];
  hidden: WorksheetEntity[];
  searchResults: SearchResultItem[];
}
