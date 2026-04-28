# Codebase Review

## Review Goal

Check whether the current implementation still respects the agreed architecture rules:

- small components
- clear boundaries
- Office.js outside presentation
- logic separated from UI
- AI-friendly structure

## Current Assessment

### What is going well

- The repository is clearly split into:
  - `domain`
  - `infrastructure`
  - `application`
  - `ui`
  - `taskpane`
- Office integration is outside presentational components
- Navigation rules are centralized in reducer/selectors instead of JSX
- UI components are still small in line count
- The main visual source of truth is centralized in one stylesheet
- The project already has product, design, tech, and dev docs

### What is acceptable but should be watched

- `TaskpaneAppContainer.tsx` is becoming the orchestration hotspot
- Context menu logic currently lives there, which is acceptable for now, but should not grow uncontrolled
- Sheet and group rename plus group creation are product-owned (**InlineRenameInput**, **InlineGroupCreator**); remaining UX risk is mostly **real Excel host** validation (focus, menus, webview quirks), not missing `window.prompt` replacements

### What was cleaned up

- Removed unused files that no longer matched the current direction:
  - `src/ui/components/GroupComposer.tsx`
  - `src/ui/shared/groupColors.ts`

This reduces noise for future AI work.

## Architecture Rule Check

### Component size

Current UI components are still small and readable.

### Separation of concerns

- good: reducer/selectors own navigation rules
- good: persistence is separated
- good: Office adapter is separated
- acceptable: context-menu orchestration is in one container for now

### Styling strategy

- good: one global stylesheet
- good: Office theme adapter writes runtime tokens
- improved: style system is now documented in `docs/design/style-system.md`

### AI-first readability

- file names are descriptive
- folders are easy to scan
- boundaries are understandable without reverse-engineering the whole repo

## Recommendations Going Forward

1. Keep `TaskpaneAppContainer.tsx` as the only orchestration-heavy UI file unless it becomes too large.
2. If the menu system grows more, extract a dedicated `ContextMenu` component and menu action helpers.
3. Keep style tokens in global CSS and avoid adding scattered inline color decisions.
4. Any future visual refactor should update `docs/design/style-system.md` if it changes the styling strategy.

## Verdict

The codebase is still aligned with the agreed architecture direction.

It is **not finished visually**, but it is **not chaotic structurally** either.

That is important: the product can still evolve without collapsing into a React mess, as long as we keep guarding the container logic and the style system discipline.
