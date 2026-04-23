import type { NavigableItem, NavigatorView } from './types';

/**
 * Idle visual highlight anchor: which `worksheet:` / `group-header:` id owns the strong wash
 * when no logical list focus exists. Must stay aligned with rows that actually render that id.
 *
 * @see docs/navigation/active-visual-anchor.md
 */
export function deriveActiveVisualItemId(
  activeWorksheetId: string | null,
  navigatorView: NavigatorView,
  navigableItems: readonly NavigableItem[],
): string | null {
  if (!activeWorksheetId) {
    return null;
  }

  const activeWorksheetItemId = `worksheet:${activeWorksheetId}`;
  if (navigableItems.some((item) => item.id === activeWorksheetItemId)) {
    return activeWorksheetItemId;
  }

  if (navigatorView.hidden.some((worksheet) => worksheet.worksheetId === activeWorksheetId)) {
    return activeWorksheetItemId;
  }

  const collapsedOwningGroup = navigatorView.groups.find(
    (group) =>
      group.isCollapsed &&
      group.worksheets.some((worksheet) => worksheet.worksheetId === activeWorksheetId),
  );

  if (!collapsedOwningGroup) {
    return null;
  }

  const groupHeaderItemId = `group-header:${collapsedOwningGroup.groupId}`;
  return navigableItems.some((item) => item.id === groupHeaderItemId) ? groupHeaderItemId : null;
}
