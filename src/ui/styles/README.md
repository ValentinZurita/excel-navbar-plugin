# UI Styles Organization

This folder defines shared style layers for the taskpane UI.

## Layers

1. `src/taskpane/styles.css`

- Global theme tokens (`--excel-*`), reset, scrollbar, and shell-level layout only.
- Avoid adding component-specific selectors here.

1. `src/ui/styles/taskpaneUtilities.css`

- Reusable utilities shared across multiple components (`.sheet-link`, `.search-result`, `.primary-tabs`, etc.).
- Keep only classes that are used by at least two components.

1. `src/ui/components/<Component>/...`

- Component ownership styles and markup colocated in each folder (`index.tsx`, local `*.css`).
- Prefer colocated CSS to avoid cross-feature coupling.

1. `src/ui/taskpane/styles/*.css`

- Feature-specific taskpane styles that do not belong to generic components (for example contextual menus).

## Rules

- Add new reusable utilities in `taskpaneUtilities.css` only when they are truly shared.
- If a selector is used by one component, keep it in that component's CSS file.
- When moving styles, run full lint and test suite before committing.
