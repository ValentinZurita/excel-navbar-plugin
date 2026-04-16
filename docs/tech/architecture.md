# Technical Architecture

- React + TypeScript + Office.js
- Adapter/service layer outside UI
- Container/presentational split
- Single workbook navigation store
- Workbook-first persistence: Custom XML first, settings metadata second, workbook-scoped local cache as degraded recovery
- Small focused components and low cognitive complexity

## Persistence contract

- `CustomXmlParts` is the canonical store for the current workbook when the host supports it
- `Office.context.document.settings` stores metadata, migration state, and compatibility fallback payloads for hosts without Custom XML support
- Local cache is scoped by stable workbook identity and never shared globally across workbooks
- Worksheet identity prefers plugin-owned worksheet custom properties and falls back to native Excel worksheet IDs only when host capabilities require it
- Unsaved or identity-less workbooks still avoid local recovery and surface session-only messaging until the file is saved
- The legacy global cache key is ignored and cleaned so one workbook cannot hydrate another workbook's groups
- Persistence degradation is capability-driven and surfaced through a subtle task pane banner instead of silent failure

## Sync contract

- The task pane rehydrates from workbook snapshots through a sync coordinator
- Workbook events are used when available; lightweight polling remains as resilience fallback
- Persistence writes are dirty-checked and idempotent
- Reconciliation is pure-domain logic that cleans stale worksheet references before the next save

## Worksheet drag-and-drop guardrails

- Keep worksheet drag state explicit in React state or refs. Do not rely on raw CSS pseudo-classes for critical interaction state.
- Keep the dragged source row in the list as a non-interactive ghost placeholder. Do not remove it from layout during drag.
- Render the drag preview through `DragOverlay`. Keep the overlay mounted and only switch its children.
- Treat the overlay as presentational only. It must not keep button semantics, tab focus, or pointer interaction.
- Apply drag preview offsets through `dnd-kit` modifiers, not by overriding the overlay `transform` style directly.
- Keep hover-driven affordances secondary. If a visual state matters for correctness, drive it from explicit props or data attributes.
- During drag, non-target worksheet row leading indicators must remain in their base state. Visual drag emphasis belongs to the overlay, source ghost, insertion line, and active group drop target only.
- Preserve a single source of truth for the final drop target. Preview state may inform the UI, but the committed drop must come from the drag event payload.

## Safety checklist before changing worksheet drag behavior

Before touching worksheet drag interaction, verify all of the following:

1. The source row still reserves space in the list while dragging.
2. The overlay follows the pointer and does not stay fixed on scroll.
3. The source row cannot intercept pointer events while dragging.
4. Active and inactive worksheets use the same overlay visual treatment.
5. Dropping back into the original position does not leave extra highlight or focus artifacts behind.
6. Group headers, insertion lines, and worksheet rows still receive the correct target under stress dragging.

If a proposed change cannot satisfy this checklist, stop and re-evaluate before merging.
