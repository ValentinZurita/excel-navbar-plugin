# Feature Breakdown

## Sidebar Navigator
Pinned sheets, groups, ungrouped sheets, and hidden sheets render in a single task pane.

## Groups
Manual, single-membership groups that do not change workbook order.
When local user actions remove the last sheet from a group, that group is removed automatically for cleaner navigation.
Groups can still appear empty after external workbook edits remove their member sheets.
When local auto-removal happens, a short Undo toast appears so users can restore the group quickly.

## Sidebar Ordering
Visible ungrouped sheets can be reordered inside the sidebar without changing the real Excel tab order.
Visible unpinned sheets can move between the Sheets section and groups, and between groups.

## Navigation
Clicking a visible sheet activates it immediately.

## Search
Search filters by sheet name and can show subtle group context.
Grouped results use folder icon in result row for visual coherence with Groups section.

## Pinning
Only ungrouped sheets can be pinned, and pinned sheets do not participate in drag-and-drop ordering.

## Hidden Sheets
A subdued, collapsible section lists hidden sheets and can unhide standard hidden sheets.
Hidden sheets do not participate in drag-and-drop ordering.

## Rename Worksheet
Rename is a contextual utility action.

## Add Worksheet
A floating "+" action in the bottom-right corner creates a new worksheet using Excel naming behavior and activates it immediately.
The action hides while drag-and-drop is active to avoid interaction conflicts.
