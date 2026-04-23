# Project Status

## Current State

The repository now contains a working Excel Office Add-in for **Sheet Navigator** with the current visual baseline already established by the human reviewer.

Implemented and documented so far:

- Excel manifest with ribbon button + task pane entry
- React + TypeScript project structure
- Office adapter boundary
- Workbook-first persistence with Custom XML canonical storage, settings metadata fallback, worksheet identity hardening, and workbook-scoped local recovery
- Single navigation store
- Modular task pane UI with folder-per-component structure
- Core navigation rules for groups, pinning, hidden sheets, rename, and delete-group confirmation
- Product-owned dialog flows for create, rename, and delete-group actions
- Sidebar drag-and-drop for visible unpinned sheets across Sheets and Groups
- Local persisted ordering for the Sheets section without changing Excel workbook tab order
- Workbook sync coordinator with event-aware refresh plus polling fallback
- Design baseline + next-phase docs aligned with the current product direction
- Quality gates for TypeScript, component import boundaries, CSS, Markdown, import cycles, test coverage thresholds, dead code (knip), bundle size, Office.js API requirements, mock drift detection, lockfile sync, and accessibility (jest-axe)
- Pre-commit hooks with husky + lint-staged + commitlint for immediate feedback
- ErrorBoundary to prevent blank task pane crashes
- Test coverage for navigation behavior and core task pane interactions

## Verified So Far

Verified in this session:

- `npm run lint` ✅
- `npm run test:coverage` ✅ (79.88% stmts, 81.26% branch, 78.47% funcs, 79.88% lines)
- `npm run check:import-cycles` ✅ (141 files, no cycles)
- `npm run check:knip` ✅ (no unused files/exports/deps)
- `npm run check:bundle-size` ✅ (388.5 KiB / 400 KiB limit)
- `npm run check:office-api-requirements` ✅
- `npm run check:mock-drift` ✅ (advisory — 8 APIs need mock coverage)
- `npm run check:lockfile-sync` ✅
- `npm run quality` ✅
- Pre-commit hooks (husky + lint-staged + commitlint) ✅
- jest-axe accessibility baseline ✅

## Critical Blocker (P0)

**Unresolved drag-and-drop visual integrity bug in task pane navigation.**

Observed in manual stress tests:

- Ghost hover/highlight states can still appear on multiple groups and worksheet rows after aggressive drag movement.
- Insertion line and perceived pointer target can drift apart under fast pointer movement, degrading placement trust.
- UX consistency is currently unreliable under stress scenarios.

Current state:

- The issue has been reduced in some paths but is **not resolved**.
- This is a release-blocking quality issue and must be fixed before continuing with other implementation tracks.

Working findings so far:

- Stale projected drop target handling was one contributor and has partial mitigation.
- Pointer-first collision strategy reduced some false positives but does not fully eliminate stress-case artifacts.
- The remaining defect likely involves interaction between collision targeting, visual state classes, and rapid over-null-over transitions.

Required next phase:

1. Add temporary instrumentation for drag lifecycle (`start/over/end/cancel`) with target IDs and kinds.
2. Capture reproducible stress traces for over transitions and highlight class application.
3. Define strict visual-state contract: only one active drop target + one insertion indicator at any time.
4. Implement fix based on evidence, then validate with stress protocol and regression tests.

Not yet verified in this session:

- Real Excel sideloading
- Real task pane behavior inside Excel host
- Manifest install flow in Excel
- Real drag-and-drop behavior inside Excel host
- Office runtime behavior with real workbook events
- Real workbook persistence behavior across reopen flows

## What Exists in the Codebase

### Core entry points

- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/manifest.xml`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/taskpane/index.tsx`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/taskpane/App.tsx`

### Navigation logic

- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/domain/navigation/types.ts`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/domain/navigation/reducer.ts`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/domain/navigation/selectors.ts`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/domain/navigation/persistenceModel.ts`

### Integration layer

- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/infrastructure/office/OfficeWorkbookAdapter.ts`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/infrastructure/persistence/NavigationPersistence.ts`

### UI layer

- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/ui/taskpane/TaskpaneAppContainer.tsx`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/ui/components/`

### Tests

- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/tests/navigation/`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/tests/ui/`

## Next Recommended Step

### Immediate next step

**Resolve the task pane DnD ghost-highlight and insertion-line drift blocker before any other work.**

Why this is next:

- The bug directly breaks trust in core navigation interactions.
- It produces visible multi-highlight artifacts and inconsistent insertion cues.
- Continuing with new feature work before stabilizing this flow increases rework risk.
- A robust root-cause investigation is required, not quick UI masking.

## After That

Once sideloading is confirmed, the next implementation pass should focus on:

1. non-visual interaction cleanup for contextual actions
2. workbook event handling and sync resilience
3. persistence validation in real workbook reopen flows, including workbook-scoped recovery and local Sheets ordering
4. documentation alignment when behavior or verified reality changes

## Open Risks

- Manifest/task pane behavior may differ from expectations in the real Excel host
- Office.js worksheet APIs may need adjustment once tested against live workbooks
- Workbook changes outside the task pane may challenge the new local Sheets ordering rules until reconciliation is tested in real host flows
- Workbook identity availability may differ by host/save state, so session-only persistence must be validated in real Excel
- VeryHidden behavior remains intentionally conservative and may need product clarification later
- Host rendering may still expose edge cases in dialog layering, context menu placement, or focus handling
- `docs/dev/status.md` must stay aligned with verified code and recent commits so future resumes do not start from stale assumptions

## AI Resume Instructions

If an AI resumes this project, it should do this first:

1. Read `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/dev/status.md`
2. Read `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/AGENTS.md`
3. Read `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/ai/ai_workflow.md`
4. Check `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/tech/architecture.md`
5. Check `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/dev/tasks.md`
6. Run verification commands before claiming progress

## Human Resume Instructions

If the human returns later, the simplest recovery prompt is:

> Resume the Sheet Navigator project from `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/dev/status.md`, follow `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/AGENTS.md`, and continue with the next recommended step.

## Definition of Truth

When docs, memory, and code disagree:

1. verified running behavior wins
2. then code
3. then `status.md`
4. then planning docs

## Last Session Outcome

This project has moved beyond the initial scaffold stage, with interaction ownership largely in place, but it is still **not yet validated inside Excel itself**.

## Persistence Notes

- The legacy global cache key `sheetNavigator.navigation.cache` is now considered unsafe because it can leak state across workbooks
- New persistence behavior must prefer Custom XML as the canonical workbook store, then settings metadata / compatibility fallback, then workbook-scoped local recovery only when canonical writes fail
- Worksheet identity now prefers plugin-owned worksheet custom properties and falls back to native worksheet IDs only on hosts that lack that capability
