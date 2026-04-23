import type { GroupColorToken } from './types';

export const legacyMetadataVersion = 1;
export const persistedSchemaVersion = 2;
export const workbookSettingsKey = 'sheetNavigator.navigation';
export const workbookSettingsFallbackKey = 'sheetNavigator.navigation.fallback';
export const workbookSettingsMetadataKey = 'sheetNavigator.navigation.metadata';
export const legacyLocalCacheKey = 'sheetNavigator.navigation.cache';
export const customXmlPartNamespace = 'https://sheetnavigator.app/navigation/v2';
export const customXmlPartRootTag = 'sheetNavigatorNavigation';
export const worksheetStableIdPropertyKey = 'sheetNavigator.stableSheetId';

export function buildScopedLocalCacheKey(stableWorkbookKey: string) {
  return `${legacyLocalCacheKey}::${encodeURIComponent(stableWorkbookKey)}`;
}

// Colors used for automatic color rotation on group creation.
// 'none' is intentionally excluded: it is a deliberate user choice, never a default.
export const groupColorTokens: GroupColorToken[] = ['blue', 'green', 'yellow', 'purple', 'red'];

// All colors the user can explicitly pick, including the "no color" option.
export const selectableGroupColorTokens: GroupColorToken[] = [
  'none',
  'blue',
  'green',
  'yellow',
  'purple',
  'red',
];
