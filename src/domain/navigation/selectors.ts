import {
  compareFuzzySearchMatches,
  fuzzySearchMatch,
  normalizeSearchQuery,
  type FuzzySearchMatch,
} from './fuzzySearch';
import { byWorkbookOrder } from './utils';
import type {
  NavigationState,
  NavigatorGroupView,
  NavigatorView,
  SearchResultItem,
  WorksheetEntity,
} from './types';

export type NavigatorStructureView = Omit<NavigatorView, 'searchResults'>;

interface ScoredWorksheetSearchMatch {
  worksheet: WorksheetEntity;
  match: FuzzySearchMatch;
}

function splitWorksheets(state: NavigationState) {
  const worksheets = Object.values(state.worksheetsById);
  const visibleWorksheets: WorksheetEntity[] = [];
  const hidden: WorksheetEntity[] = [];
  const groupedVisibleWorksheetsByGroupId = new Map<string, WorksheetEntity[]>();
  const pinnedVisibleWorksheets: WorksheetEntity[] = [];
  const ungroupedVisibleWorksheets: WorksheetEntity[] = [];

  for (const worksheet of worksheets) {
    if (worksheet.visibility !== 'Visible') {
      hidden.push(worksheet);
      continue;
    }

    visibleWorksheets.push(worksheet);

    if (worksheet.groupId) {
      const groupWorksheets = groupedVisibleWorksheetsByGroupId.get(worksheet.groupId) ?? [];
      groupWorksheets.push(worksheet);
      groupedVisibleWorksheetsByGroupId.set(worksheet.groupId, groupWorksheets);
      continue;
    }

    if (worksheet.isPinned) {
      pinnedVisibleWorksheets.push(worksheet);
      continue;
    }

    ungroupedVisibleWorksheets.push(worksheet);
  }

  return {
    visibleWorksheets,
    hidden,
    groupedVisibleWorksheetsByGroupId,
    pinnedVisibleWorksheets,
    ungroupedVisibleWorksheets,
  };
}

function scoreVisibleWorksheetsForSearch(
  worksheets: WorksheetEntity[],
  query: string,
): ScoredWorksheetSearchMatch[] {
  return worksheets.flatMap((worksheet) => {
    const match = fuzzySearchMatch(worksheet.name, query);

    if (!match) {
      return [];
    }

    return [{ worksheet, match }];
  });
}

function compareScoredWorksheetSearchMatches(
  left: ScoredWorksheetSearchMatch,
  right: ScoredWorksheetSearchMatch,
): number {
  const scoreComparison = compareFuzzySearchMatches(left.match, right.match);

  if (scoreComparison !== 0) {
    return scoreComparison;
  }

  return byWorkbookOrder(left.worksheet, right.worksheet);
}

function toSearchResultItem(
  state: NavigationState,
  entry: ScoredWorksheetSearchMatch,
): SearchResultItem {
  const { worksheet, match } = entry;

  return {
    worksheetId: worksheet.worksheetId,
    name: worksheet.name,
    visibility: worksheet.visibility,
    isPinned: worksheet.isPinned,
    isGrouped: worksheet.groupId !== null,
    groupName: worksheet.groupId ? (state.groupsById[worksheet.groupId]?.name ?? null) : null,
    groupColor: worksheet.groupId
      ? (state.groupsById[worksheet.groupId]?.colorToken ?? null)
      : null,
    matchedIndices: match.matchedIndices,
  };
}

export function buildNavigatorStructure(state: NavigationState): NavigatorStructureView {
  const {
    visibleWorksheets,
    hidden,
    groupedVisibleWorksheetsByGroupId,
    pinnedVisibleWorksheets,
    ungroupedVisibleWorksheets,
  } = splitWorksheets(state);

  const sheetSectionOrder = state.sheetSectionOrder.length
    ? state.sheetSectionOrder
    : [...visibleWorksheets].sort(byWorkbookOrder).map((worksheet) => worksheet.worksheetId);
  const sheetOrderIndex = new Map(
    sheetSectionOrder.map((worksheetId, index) => [worksheetId, index]),
  );

  const pinnedWorksheetIds = new Set(
    pinnedVisibleWorksheets.map((worksheet) => worksheet.worksheetId),
  );
  const pinnedOrderList = state.pinnedWorksheetOrder.filter((id) => pinnedWorksheetIds.has(id));
  const pinnedOrderIndex = new Map(pinnedOrderList.map((id, index) => [id, index]));

  const pinned = pinnedVisibleWorksheets.sort((left, right) => {
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
      const groupWorksheets = groupedVisibleWorksheetsByGroupId.get(group.groupId) ?? [];
      const worksheetLookup = new Map(
        groupWorksheets.map((worksheet) => [worksheet.worksheetId, worksheet]),
      );
      const orderedWorksheetIds = new Set<string>();

      const orderedWorksheets = group.worksheetOrder
        .map((worksheetId) => {
          const worksheet = worksheetLookup.get(worksheetId);
          if (!worksheet) {
            return null;
          }

          orderedWorksheetIds.add(worksheetId);
          return worksheet;
        })
        .filter((worksheet): worksheet is WorksheetEntity => Boolean(worksheet));

      const fallbackWorksheets = groupWorksheets
        .filter((worksheet) => !orderedWorksheetIds.has(worksheet.worksheetId))
        .sort(byWorkbookOrder);

      return {
        groupId: group.groupId,
        name: group.name,
        colorToken: group.colorToken,
        isCollapsed: group.isCollapsed,
        worksheets: [...orderedWorksheets, ...fallbackWorksheets],
      };
    });

  const ungrouped = ungroupedVisibleWorksheets.sort((left, right) => {
    const leftOrder = sheetOrderIndex.get(left.worksheetId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = sheetOrderIndex.get(right.worksheetId) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder === rightOrder) {
      return byWorkbookOrder(left, right);
    }

    return leftOrder - rightOrder;
  });

  hidden.sort(byWorkbookOrder);

  return { pinned, groups, ungrouped, hidden };
}

export function buildSearchResults(state: NavigationState): SearchResultItem[] {
  const query = normalizeSearchQuery(state.query);

  if (!query) {
    return [];
  }

  const { visibleWorksheets } = splitWorksheets(state);

  return scoreVisibleWorksheetsForSearch(visibleWorksheets, query)
    .sort(compareScoredWorksheetSearchMatches)
    .map((entry) => toSearchResultItem(state, entry));
}

export function buildNavigatorView(state: NavigationState): NavigatorView {
  return {
    ...buildNavigatorStructure(state),
    searchResults: buildSearchResults(state),
  };
}
