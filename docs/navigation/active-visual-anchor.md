# Active visual anchor (idle highlight)

When the user is not focusing a specific navigator row (pointer idle clear, etc.), the task pane still shows which worksheet is **active in Excel** using the same strong wash as keyboard focus. That fallback id is computed by `deriveActiveVisualItemId` in `src/domain/navigation/deriveActiveVisualItemId.ts` and passed to keyboard navigation as `activeVisualItemId`.

## Resolution order

1. **No active worksheet** → `null` (no idle wash).
2. **Active sheet appears in the linear `buildNavigableItems` list** → `worksheet:{id}` (normal pinned / grouped / ungrouped rows).
3. **Active sheet appears only in `navigatorView.hidden`** → `worksheet:{id}` so the wash can target the Hidden section row (same `worksheet:` prefix as `HiddenSheetRow`).
4. **Active sheet sits inside a collapsed group** → `group-header:{groupId}` if that header is present in the linear list; otherwise `null`.

## Hidden section collapsed

Hidden rows are not mounted while the Hidden section is collapsed. If the active worksheet exists **only** in Hidden, `activeVisualItemId` may still be `worksheet:{id}` even though no row is in the DOM until the user expands Hidden. That is expected: expanding the section reveals the already-correct anchor.

## Search mode

With an active search query, `buildNavigableItems` returns only search hits; `deriveActiveVisualItemId` is still evaluated from the non-search navigator view in `TaskpaneSections`. Keyboard navigation clears the strong visual anchor while search is active via `computeVisualFocusedItemId` (`useHighlightLifecycle.ts`), so the idle anchor does not compete with search results.
