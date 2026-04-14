import { byWorkbookOrder } from './utils';
import type {
  NavigationState,
  NavigatorGroupView,
  NavigatorView,
  SearchResultItem,
  WorksheetEntity,
} from './types';

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

function matchesSearch(query: string, worksheet: WorksheetEntity) {
  return normalizeSearchValue(worksheet.name).includes(query);
}

export function buildNavigatorView(state: NavigationState): NavigatorView {
  const query = normalizeSearchValue(state.query);
  const worksheets = Object.values(state.worksheetsById);
  const visibleWorksheets = worksheets.filter((worksheet) => worksheet.visibility === 'Visible');
  const sheetSectionOrder = state.sheetSectionOrder.length
    ? state.sheetSectionOrder
    : visibleWorksheets
        .sort(byWorkbookOrder)
        .map((worksheet) => worksheet.worksheetId);
  const sheetOrderIndex = new Map(sheetSectionOrder.map((worksheetId, index) => [worksheetId, index]));

  // Build pinned order index from pinnedWorksheetOrder
  const pinnedWorksheetIds = new Set(
    visibleWorksheets.filter((w) => w.isPinned && w.groupId === null).map((w) => w.worksheetId),
  );
  const pinnedOrderList = state.pinnedWorksheetOrder.filter((id) => pinnedWorksheetIds.has(id));
  const pinnedOrderIndex = new Map(pinnedOrderList.map((id, index) => [id, index]));

  const pinned = visibleWorksheets
    .filter((worksheet) => worksheet.isPinned && worksheet.groupId === null)
    .sort((left, right) => {
      const leftOrder = pinnedOrderIndex.get(left.worksheetId) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = pinnedOrderIndex.get(right.worksheetId) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder === rightOrder) {
        return byWorkbookOrder(left, right);
      }

      return leftOrder - rightOrder;
    });

  const groups: NavigatorGroupView[] = state.groupOrder
    .map((groupId) => state.groupsById[groupId])
    .filter(Boolean)
    .map((group) => {
      const worksheetLookup = visibleWorksheets
        .filter((worksheet) => worksheet.groupId === group.groupId)
        .reduce<Record<string, WorksheetEntity>>((accumulator, worksheet) => {
          accumulator[worksheet.worksheetId] = worksheet;
          return accumulator;
        }, {});

      const orderedWorksheets = group.worksheetOrder
        .map((worksheetId) => worksheetLookup[worksheetId])
        .filter(Boolean);

      const fallbackWorksheets = visibleWorksheets
        .filter((worksheet) => worksheet.groupId === group.groupId && !group.worksheetOrder.includes(worksheet.worksheetId))
        .sort(byWorkbookOrder);

      return {
        groupId: group.groupId,
        name: group.name,
        colorToken: group.colorToken,
        isCollapsed: group.isCollapsed,
        worksheets: [...orderedWorksheets, ...fallbackWorksheets],
      };
    });

  const ungrouped = visibleWorksheets
    .filter((worksheet) => !worksheet.isPinned && worksheet.groupId === null)
    .sort((left, right) => {
      const leftOrder = sheetOrderIndex.get(left.worksheetId) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = sheetOrderIndex.get(right.worksheetId) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder === rightOrder) {
        return byWorkbookOrder(left, right);
      }

      return leftOrder - rightOrder;
    });

  const hidden = worksheets
    .filter((worksheet) => worksheet.visibility !== 'Visible')
    .sort(byWorkbookOrder);

  const searchResults = query
    ? visibleWorksheets
        .filter((worksheet) => matchesSearch(query, worksheet))
        .sort(byWorkbookOrder)
        .map<SearchResultItem>((worksheet) => ({
          worksheetId: worksheet.worksheetId,
          name: worksheet.name,
          visibility: worksheet.visibility,
          isPinned: worksheet.isPinned,
          groupName: worksheet.groupId ? state.groupsById[worksheet.groupId]?.name ?? null : null,
        }))
    : [];

  return { pinned, groups, ungrouped, hidden, searchResults };
}
