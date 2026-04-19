import type { NavigableItem, SearchResultItem, NavigatorGroupView, WorksheetEntity } from './types';

interface BuildNavigableItemsArgs {
  query: string;
  searchResults: SearchResultItem[];
  pinned: WorksheetEntity[];
  groups: NavigatorGroupView[];
  ungrouped: WorksheetEntity[];
}

/**
 * Builds a linear list of navigable items from the current navigation view.
 * This list represents the order items appear visually and should be navigable
 * with ArrowDown/ArrowUp keys.
 *
 * When a search query is active, returns only search results.
 * When no search query, returns the full tree: Pinned → Groups → Ungrouped.
 *
 * @example
 * buildNavigableItems({ query: '', ... }) returns:
 * [
 *   { id: 'worksheet:sheet-1', kind: 'worksheet', ... }, // pinned
 *   { id: 'group-header:group-1', kind: 'group-header', ... },
 *   { id: 'worksheet:sheet-2', kind: 'worksheet', ... }, // inside expanded group
 *   { id: 'worksheet:sheet-3', kind: 'worksheet', ... }, // ungrouped
 * ]
 */
export function buildNavigableItems(args: BuildNavigableItemsArgs): NavigableItem[] {
  const { query, searchResults, pinned, groups, ungrouped } = args;
  const items: NavigableItem[] = [];

  // When searching, only search results are navigable
  if (query.trim()) {
    for (const result of searchResults) {
      items.push({
        id: `search:${result.worksheetId}`,
        kind: 'search-result',
        worksheetId: result.worksheetId,
        name: result.name,
      });
    }
    return items;
  }

  // Pinned worksheets (not in a group)
  for (const worksheet of pinned) {
    items.push({
      id: `worksheet:${worksheet.worksheetId}`,
      kind: 'worksheet',
      worksheetId: worksheet.worksheetId,
      name: worksheet.name,
    });
  }

  // Groups with their worksheets
  for (const group of groups) {
    // Group header is always navigable
    items.push({
      id: `group-header:${group.groupId}`,
      kind: 'group-header',
      groupId: group.groupId,
      isGroupCollapsed: group.isCollapsed,
      name: group.name,
    });

    // Worksheets inside the group (only if expanded)
    if (!group.isCollapsed) {
      for (const worksheet of group.worksheets) {
        items.push({
          id: `worksheet:${worksheet.worksheetId}`,
          kind: 'worksheet',
          worksheetId: worksheet.worksheetId,
          groupId: group.groupId,
          name: worksheet.name,
        });
      }
    }
  }

  // Ungrouped worksheets
  for (const worksheet of ungrouped) {
    items.push({
      id: `worksheet:${worksheet.worksheetId}`,
      kind: 'worksheet',
      worksheetId: worksheet.worksheetId,
      name: worksheet.name,
    });
  }

  return items;
}

/**
 * Returns the next item after the given currentId.
 * Returns null if currentId is the last item or not found.
 * No wrapping - behaves like Excel tab navigation.
 */
export function getNextItem(currentId: string, items: NavigableItem[]): NavigableItem | null {
  const currentIndex = items.findIndex((item) => item.id === currentId);

  if (currentIndex === -1) {
    return null;
  }

  if (currentIndex >= items.length - 1) {
    return null;
  }

  return items[currentIndex + 1];
}

/**
 * Sentinel ID for representing the search input when navigating from first result back up.
 */
export const SEARCH_INPUT_SENTINEL_ID = '__search_input__';

/**
 * Returns the previous item before the given currentId.
 * Returns null if currentId is the first item or not found.
 * If searchActive is true and currentId is the first item, returns the sentinel
 * representing the search input.
 */
export function getPrevItem(
  currentId: string,
  items: NavigableItem[],
  searchActive: boolean,
): NavigableItem | null {
  const currentIndex = items.findIndex((item) => item.id === currentId);

  if (currentIndex === -1) {
    return null;
  }

  if (currentIndex === 0) {
    // If at first item and search is active, return to search input
    if (searchActive) {
      return {
        id: '__search_input__',
        kind: 'search-result',
        name: '',
      };
    }
    return null;
  }

  return items[currentIndex - 1];
}

/**
 * Returns the first navigable item, or null if list is empty.
 */
export function getFirstItem(items: NavigableItem[]): NavigableItem | null {
  return items[0] ?? null;
}

/**
 * Returns the last navigable item, or null if list is empty.
 */
export function getLastItem(items: NavigableItem[]): NavigableItem | null {
  return items[items.length - 1] ?? null;
}

/**
 * Checks if the given ID exists in the items list.
 */
export function hasItem(itemId: string, items: NavigableItem[]): boolean {
  return items.some((item) => item.id === itemId);
}

/**
 * Returns native worksheet id for `worksheet:{id}` navigable keys, else null.
 */
export function parseWorksheetNavigableItemId(itemId: string): string | null {
  if (!itemId.startsWith('worksheet:')) {
    return null;
  }
  return itemId.slice('worksheet:'.length);
}

/**
 * True when the id refers to a worksheet listed in the Hidden section (not in the linear navigable list).
 */
export function isWorksheetItemInHiddenSectionList(
  itemId: string,
  hiddenWorksheetIds: readonly string[],
): boolean {
  const worksheetId = parseWorksheetNavigableItemId(itemId);
  if (worksheetId === null) {
    return false;
  }
  return hiddenWorksheetIds.includes(worksheetId);
}

/**
 * Navigable list membership OR hidden-section worksheet (same `worksheet:{id}` keys as rows elsewhere).
 */
export function isNavListItemOrHiddenWorksheet(
  itemId: string | null,
  items: NavigableItem[],
  hiddenWorksheetIds: readonly string[],
): boolean {
  if (!itemId) {
    return false;
  }
  if (hasItem(itemId, items)) {
    return true;
  }
  return isWorksheetItemInHiddenSectionList(itemId, hiddenWorksheetIds);
}
