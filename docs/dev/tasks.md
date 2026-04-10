# Implementation Tasks

## Working style
AI-first execution with human supervision. Tasks should stay small, explicit, and verified.

## Definition of Done

- Code
- Relevant tests
- Visual/behavior acceptance note
- Verification before claiming completion

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

### Implemented but still needs real Excel validation

- [ ] Sideload and validate manifest behavior in Excel
- [ ] Validate task pane rendering in real Excel host
- [ ] Validate context menu behavior in real Excel host
- [ ] Validate dialog focus / keyboard / close behavior in real Excel host
- [ ] Validate worksheet activation from search in real Excel host
- [ ] Validate rename worksheet against real Office.js runtime
- [ ] Validate hide / unhide behavior against real Office.js runtime
- [ ] Validate persistence after workbook reopen
- [ ] Validate sync behavior when workbook changes outside the task pane

### Pending implementation or hardening

- [ ] Context-menu behavior cleanup without changing visuals
- [ ] Workbook event / sync resilience hardening
- [ ] Better error handling around Office runtime failures
- [ ] Update planning docs that still describe already-completed interaction ownership work

### Not implemented in current codebase

- [ ] Delete worksheet from Excel

### Not part of current MVP unless product scope changes

- [ ] Preview-first navigation flows
- [ ] Smart suggestions
- [ ] Recent usage intelligence
- [ ] Automatic grouping
- [ ] Advanced ranking logic
- [ ] Reordering actual Excel worksheet order

## Notes

- `Delete worksheet` is not implemented and is also not currently documented as MVP in `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/product/mvp.md`.
- Preview/view-style navigation is explicitly outside current MVP scope in `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/product/mvp.md`.
- If product scope changes, update `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/product/features.md` and `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/product/mvp.md` before implementation.
