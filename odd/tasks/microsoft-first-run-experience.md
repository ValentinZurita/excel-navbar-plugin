# Microsoft First-Run Value Proposition

## Objective

Add a robust, non-authenticated first-run experience to Sheet Navigator so Microsoft Marketplace reviewers see the product value before using the task pane, while preserving the existing keyboard-first navigator flow.

## Problem

Microsoft certification report 1100.1.5 says the add-in requires sign-in without clearly communicating its value. The current task pane opens directly into search and worksheet sections, with no explicit value proposition or first-use guidance. The app itself has no sign-in or subscription gate.

## Why

Address the remaining certification observation with a real in-product first-run experience, not only Marketplace listing copy, and make the behavior resilient across task-pane reloads.

## Scope and constraints

- Add an English, concise first-run value placemat in the task pane.
- Make it visible before the main navigator controls on first run.
- Include clear product value, concrete capabilities, and one direct next action.
- Persist dismissal locally without introducing authentication, subscriptions, or workbook data storage.
- Keep the existing navigation UI, keyboard behavior, and Office architecture intact.
- Do not run the build unless explicitly requested.
- Do not click Partner Center “Review and publish” in this task; final submission remains a separate user confirmation.

## Route

- Direct inline implementation: the native sub-agent spawning tools were not exposed in this session.
- Verification: `pnpm validate`, `pnpm quality`, and `git diff --check`; no build.

## Acceptance criteria

- First-run panel clearly states what Sheet Navigator does and why it helps.
- Panel exposes an accessible primary action and dismiss control.
- Dismissed state survives task-pane remount/reload when local storage is available.
- Storage failures do not block the add-in or hide the navigator.
- Existing UI tests and type/lint checks pass.
- Marketplace listing remains consistent with the in-product wording.

## Checklist

- [x] Implement first-run value placemat and resilient local dismissal state.
  - Added a concise English placemat before the navigator controls.
  - Persists dismissal with `sheetNavigator.fre.v1`; storage access failures fail open.
- [x] Add focused component/style/unit coverage.
  - Covered initial rendering, dismissal/focus, persistence, and blocked storage behavior.
- [x] Update relevant documentation or listing-copy reference if needed.
  - No listing-copy change needed; the in-product claims match the existing listing draft.
- [x] Run required validation and quality checks.
  - `pnpm exec vitest run tests/ui/TaskpaneAppContainer.test.tsx` passed (21 tests).
  - `pnpm validate` passed (40 files, 465 tests).
  - `pnpm quality` passed.
  - `git diff --check` passed.
- [ ] Review the live hosted result and upload/deploy the approved change.
- [ ] Record commit and verification evidence.

## Progress

- Initial audit complete; current Partner Center report still has Attention needed.
- Product Setup is Complete with “No” additional purchases selected.
- Repository audit found no authentication/subscription gate in the task pane.
- Implementation is complete locally; Partner Center and deployment remain intentionally out of scope.
- Full validation is green; existing React `act(...)` warnings and Node localStorage warnings remain non-blocking.
- Work-unit commit: `1df3a1d` (`feat(ui): add first-run value placemat`).

## Next step

Run focused tests and repository validation, then review the hosted result before any final Partner Center submission.
