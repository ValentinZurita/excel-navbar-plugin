import type { GroupColorToken } from './types';

export const metadataVersion = 1;
export const workbookSettingsKey = 'sheetNavigator.navigation';
export const legacyLocalCacheKey = 'sheetNavigator.navigation.cache';

export function buildScopedLocalCacheKey(stableWorkbookKey: string) {
  return `${legacyLocalCacheKey}::${encodeURIComponent(stableWorkbookKey)}`;
}

export const groupColorTokens: GroupColorToken[] = [
  'blue',
  'green',
  'orange',
  'purple',
  'red',
  'gray',
];
