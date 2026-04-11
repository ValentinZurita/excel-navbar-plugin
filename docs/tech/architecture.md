# Technical Architecture

- React + TypeScript + Office.js
- Adapter/service layer outside UI
- Container/presentational split
- Single workbook navigation store
- Hybrid persistence: workbook settings first, local cache second
- Small focused components and low cognitive complexity

## Worksheet drag-and-drop guardrails

- Keep worksheet drag state explicit in React state or refs. Do not rely on raw CSS pseudo-classes for critical interaction state.
- Keep the dragged source row in the list as a non-interactive ghost placeholder. Do not remove it from layout during drag.
- Render the drag preview through `DragOverlay`. Keep the overlay mounted and only switch its children.
- Treat the overlay as presentational only. It must not keep button semantics, tab focus, or pointer interaction.
- Apply drag preview offsets through `dnd-kit` modifiers, not by overriding the overlay `transform` style directly.
- Keep hover-driven affordances secondary. If a visual state matters for correctness, drive it from explicit props or data attributes.
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
