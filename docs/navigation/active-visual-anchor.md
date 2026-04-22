# Active visual anchor (idle highlight)

When the user is not focusing a specific navigator row (pointer idle clear, etc.), the task pane still shows which worksheet is **active in Excel** using the same strong wash as keyboard focus. That fallback id is computed by `deriveActiveVisualItemId` in `src/domain/navigation/deriveActiveVisualItemId.ts` and passed to keyboard navigation as `activeVisualItemId`.

## Resolution order

1. **No active worksheet** → `null` (no idle wash).
2. **Active sheet appears in the linear `buildNavigableItems` list** → `worksheet:{id}` (normal pinned / grouped / ungrouped rows).
3. **Active sheet appears in expanded Hidden section** → `worksheet:{id}` from normal linear navigation items.
4. **Active sheet appears only in `navigatorView.hidden` while Hidden is collapsed** → `worksheet:{id}` so the wash can target the Hidden section row once the section mounts.
5. **Active sheet sits inside a collapsed group** → `group-header:{groupId}` if that header is present in the linear list; otherwise `null`.

## Hidden section collapsed

When Hidden is expanded, hidden rows are part of same `buildNavigableItems` list as other taskpane rows, so arrow traversal, DOM focus restore, and context-menu anchoring all use same `worksheet:{id}` contract.

When Hidden is collapsed, rows are not mounted. If the active worksheet exists **only** in Hidden, `activeVisualItemId` may still be `worksheet:{id}` even though no row is in the DOM until the user expands Hidden. That is expected: expanding the section reveals the already-correct anchor.

## Search mode

With an active search query, `buildNavigableItems` returns only search hits; `deriveActiveVisualItemId` is still evaluated from the non-search navigator view in `TaskpaneSections`. Keyboard navigation clears the strong visual anchor while search is active via `computeVisualFocusedItemId` (`useHighlightLifecycle.ts`), so the idle anchor does not compete with search results.

## Transient focus idle timeout

After keyboard or pointer navigation, `useKeyboardNavigation` starts a timer (`TRANSIENT_NAVIGATION_IDLE_TIMEOUT_MS`). When it fires, logical row focus clears and the strong wash returns to the active worksheet. Pointer movement **inside** an element matching `.taskpane-shell` (the main task pane layout) **resets** that timer while a row still has logical focus, throttled so pointer events do not thrash timers. Movement outside the shell (for example over the Excel grid) does not reset it.
