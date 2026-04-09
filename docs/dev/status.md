# Project Status

## Current State
The repository now contains a working Excel Office Add-in scaffold for **Sheet Navigator**.

Implemented foundation:
- Excel manifest with ribbon button + task pane entry
- React + TypeScript project structure
- Office adapter boundary
- Hybrid persistence service
- Single navigation store
- Small UI components for the task pane
- Core navigation rules for groups, pinning, hidden sheets, and rename
- Initial tests for selectors, reducer behavior, persistence, and search results
- AI-first guidance docs and project rules

## Verified So Far
Verified in this session:
- `npm run lint` ✅
- `npm run test` ✅

Not yet verified in this session:
- Real Excel sideloading
- Real task pane behavior inside Excel host
- Manifest install flow in Excel
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
**Sideload and validate the add-in in real Excel.**

Why this is next:
- The scaffold is already type-safe and test-safe
- The main unknown is now host reality, not code structure
- We need to confirm manifest behavior, task pane rendering, and Office.js interaction inside Excel

## After That
Once sideloading is confirmed, the next implementation pass should focus on:
1. visual refinement toward a more Excel-native feel
2. interaction cleanup for contextual actions
3. workbook event handling and sync resilience
4. persistence validation in real workbook reopen flows

## Open Risks
- Manifest/task pane behavior may differ from expectations in the real Excel host
- Office.js worksheet APIs may need adjustment once tested against live workbooks
- VeryHidden behavior remains intentionally conservative and may need product clarification later
- Current UI is intentionally clean and modular, but still needs host-based polish

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
This project is **scaffolded and verified at lint/test level**, but **not yet validated inside Excel itself**.
