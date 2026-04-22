export type WorksheetVisibility = 'Visible' | 'Hidden' | 'VeryHidden';
export type NavigationIdentityMode = 'plugin-sheet-id' | 'native-id';

export type GroupColorToken =
  | 'none'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'red';

export interface WorksheetEntity {
  worksheetId: string;
  stableWorksheetId?: string;
  nativeWorksheetId?: string;
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

export interface WorkbookCapabilities {
  supportsCustomXml: boolean;
  supportsWorksheetCustomProperties: boolean;
  supportsWorkbookEvents: boolean;
}

export interface WorkbookSnapshot {
  worksheets: Array<Pick<WorksheetEntity, 'worksheetId' | 'stableWorksheetId' | 'nativeWorksheetId' | 'name' | 'visibility' | 'workbookOrder'>>;
  activeWorksheetId: string | null;
  identityMode?: NavigationIdentityMode;
}

export interface WorkbookPersistenceContext extends WorkbookCapabilities {
  documentSettingsAvailable: boolean;
  stableWorkbookKey: string | null;
  mode: 'stable' | 'session-only';
  source: 'document-url' | 'file-properties-url' | 'none';
}

export interface LegacyPersistedNavigationModel {
  metadataVersion: 1;
  groups: GroupEntity[];
  sheetSectionOrder: string[];
  pinnedWorksheetIds: string[];
  pinnedWorksheetOrder?: string[];
  hiddenSectionCollapsed: boolean;
  priorStructuralStateByWorksheetId: Record<string, StructuralState | null>;
}

export interface PersistedNavigationModel {
  schemaVersion: 2;
  identityMode: NavigationIdentityMode;
  groups: GroupEntity[];
  sheetSectionOrder: string[];
  pinnedWorksheetOrder: string[];
  hiddenSectionCollapsed: boolean;
  priorStructuralStateByStableWorksheetId: Record<string, StructuralState | null>;
  updatedAt: number;
}

export interface PersistenceMetadata {
  schemaVersion: 2;
  canonicalStore: 'custom-xml' | 'settings-fallback';
  migratedFrom?: 1;
  identityMode: NavigationIdentityMode;
  updatedAt: number;
}

export type PersistenceDiagnosticCode =
  | 'migrated_from_settings_v1'
  | 'fallback_to_native_identity'
  | 'repaired_stale_group_refs'
  | 'repaired_duplicate_group_membership'
  | 'dropped_unknown_pinned_ref'
  | 'recovered_from_local_cache'
  | 'custom_xml_unavailable'
  | 'custom_xml_corrupt';

export interface BannerState {
  tone: 'error' | 'warning' | 'info';
  message: string;
}

export interface PersistenceStatus {
  mode: 'custom-xml' | 'settings-fallback' | 'session-only' | 'degraded';
  banner: BannerState | null;
  lastSource: 'custom-xml' | 'settings-fallback' | 'legacy-settings' | 'scoped-local-cache' | 'none';
  diagnostics: PersistenceDiagnosticCode[];
  lastError?: string;
}

export interface NavigationState {
  worksheetsById: Record<string, WorksheetEntity>;
  groupsById: Record<string, GroupEntity>;
  groupOrder: string[];
  sheetSectionOrder: string[];
  pinnedWorksheetOrder: string[];
  hiddenSectionCollapsed: boolean;
  query: string;
  activeWorksheetId: string | null;
  lastSyncAt: number | null;
  isReady: boolean;
  identityMode: NavigationIdentityMode;
}

export interface SearchResultItem {
  worksheetId: string;
  name: string;
  visibility: WorksheetVisibility;
  isPinned: boolean;
  isGrouped: boolean;
  groupName: string | null;
  groupColor?: GroupColorToken | null;
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

/**
 * Represents an item that can receive keyboard focus in the taskpane navigator.
 * These items form a linear list for keyboard navigation (ArrowDown/ArrowUp).
 * IDs are prefixed to ensure uniqueness across different kinds of items.
 */
export interface NavigableItem {
  id: string;
  kind: 'search-result' | 'worksheet' | 'hidden-worksheet' | 'group-header';
  worksheetId?: string;
  groupId?: string;
  isGroupCollapsed?: boolean;
  name: string;
}

/**
 * Sentinel ID for representing the search input when navigating from first result back up.
 * Not a real DOM element ID, used as a return value from navigation functions.
 */
export const SEARCH_INPUT_SENTINEL_ID = '__search_input__';
