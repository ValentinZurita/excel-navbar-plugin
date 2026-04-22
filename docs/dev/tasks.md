# Implementation Tasks

## Working style
AI-first execution with human supervision. Tasks should stay small, explicit, and verified.

## Definition of Done

- Code
- Relevant tests
- Visual/behavior acceptance note
- Verification before claiming completion

## P0 Blocker: DnD Ghost Highlights And Indicator Drift [SOLVED]

- [x] Produce a deterministic repro protocol (fast-drag stress path across Sheets + Groups).
- [x] Add short-lived instrumentation for drag target transitions (`over` target id/kind/container).
- [x] Add short-lived instrumentation for highlight class application/removal on group headers and sheet rows.
- [x] Define invariant checks:
  - [x] at most one active group drop highlight
  - [x] at most one insertion indicator
  - [x] insertion indicator must map to current projected target
- [x] Implement fix from evidence (not visual masking only).
- [x] Add regression tests for rapid over-null-over transitions.
- [x] Run manual stress verification in task pane and record acceptance notes.
- [x] Remove temporary instrumentation once validated.

## Feature Audit Snapshot

This list exists so pending work does not get lost between sessions.

### Implemented in code

- [x] Sidebar navigator task pane
- [x] Search by sheet name
- [x] Manual groups
- [x] Group management:
  - [x] create group
  - [x] rename group
  - [x] delete group
  - [x] move sheet into group
  - [x] remove sheet from group
  - [x] collapse / expand group
- [x] Pinning for visible ungrouped sheets
- [x] Hidden sheets section
- [x] Unhide standard hidden sheets
- [x] Hide visible sheets
- [x] Immediate navigation on sheet selection
- [x] Rename worksheet
- [x] Product-owned dialogs for create / rename / delete-group flows
- [x] Sidebar drag-and-drop for visible unpinned sheets
- [x] Local persisted ordering for the Sheets section
- [x] Drag-and-drop policies to prevent invalid placements
- [x] Robust visual feedback for drop targets (Group highlight & Insertion line)

### Implemented but still needs real Excel validation

- [ ] Sideload and validate manifest behavior in Excel
- [ ] Validate task pane rendering in real Excel host
- [ ] Validate context menu behavior in real Excel host
- [ ] Validate drag-and-drop behavior in real Excel host
- [ ] Validate dialog focus / keyboard / close behavior in real Excel host
- [ ] Validate worksheet activation from search in real Excel host
- [ ] Validate rename worksheet against real Office.js runtime
- [ ] Validate hide / unhide behavior against real Office.js runtime
- [ ] Validate persistence after workbook reopen
- [ ] Validate sync behavior when workbook changes outside the task pane

### Pending implementation or hardening

- [ ] Context-menu behavior cleanup without changing visuals
- [ ] Workbook event / sync resilience hardening
- [ ] Reconcile external workbook tab changes against local sidebar ordering rules
- [ ] Better error handling around Office runtime failures
- [x] Batch worksheet-group delete sync to one post-delete workbook rehydrate
- [x] Update planning docs that still describe already-completed interaction ownership work
- [x] Register fallback global shortcuts (`focusSearch`, `createWorksheet`) in `index.tsx`
- [ ] Refactor `useKeyboardNavigation.ts` to break down the 750+ line monolith
  - [x] Extract global listener routing to `useKeyboardNavigationGlobalListeners.ts`
  - [x] Extract context-menu focus sync to `useKeyboardNavigationContextMenuFocusSync.ts`
  - [x] Extract item-list reconciliation to `useKeyboardNavigationItemsReconcile.ts`
- [x] Extract hardcoded mock data from `OfficeWorkbookAdapter.ts` to a dedicated mock provider

### Not implemented in current codebase

- [ ] None currently tracked (add new gaps when discovered)

### Not part of current MVP unless product scope changes

- [ ] Preview-first navigation flows
- [ ] Smart suggestions
- [ ] Recent usage intelligence
- [ ] Automatic grouping
- [ ] Advanced ranking logic
- [ ] Reordering actual Excel worksheet order

## Notes

- Preview/view-style navigation is explicitly outside current MVP scope in `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/product/mvp.md`.
- If product scope changes, update `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/product/features.md` and `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/product/mvp.md` before implementation.
