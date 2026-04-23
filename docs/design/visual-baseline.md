# Visual Baseline

## Purpose

This document marks the end of the current aesthetic foundation phase.

The goal is to preserve the design direction that has already proven correct so future iterations improve quality without drifting away from the product identity.

This is not the final visual ceiling.
It is the approved baseline.

## What this phase established

The Sheet Navigator now has a clear visual direction:

- calm and compact
- native-adjacent to Excel
- low-noise and scan-friendly
- structurally clear without looking heavy
- closer to tabs and side navigation than to cards or dashboards

This phase should be treated as a product milestone, not as temporary styling work.

## Baseline principles

### 1. Excel first

If a UI decision feels more like a generic web app than an Excel-native-adjacent pane, it is the wrong direction.

### 2. Worksheet names lead the hierarchy

The first thing the eye should find is the sheet name.
Controls, metadata, and decoration must stay secondary.

### 3. Calm over chrome

Visual quality comes from restraint.
Less noise, fewer boxes, fewer competing accents, and fewer persistent controls create a better navigator.

### 4. Contextual actions over always-visible controls

The default interface should stay clean.
Actions belong in contextual menus or focused moments unless persistent visibility is truly necessary.

### 5. Structure without heaviness

Sections, groups, pinned sheets, and hidden sheets should feel organized and readable without turning the pane into a dashboard of containers.

### 6. System over one-off styling

Theme tokens, shared selectors, and documented rules come first.
One-off component styling is the exception, not the norm.

## Approved visual characteristics

The current baseline intentionally favors:

- flat or near-flat surfaces
- subtle hover and active states
- quiet section labels
- strong text legibility
- restrained spacing rhythm
- Office theme compatibility
- contextual depth only where it improves clarity, such as menus or focused inputs

The current baseline intentionally avoids:

- decorative cards
- promotional headers
- loud shadows
- unnecessary helper text
- bright accents without functional value
- controls that compete with worksheet names

## Design guardrails for future phases

Any future visual work should pass these checks:

1. Does it feel more like Excel and less like a random web app?
2. Does it improve scanning speed?
3. Does it keep the worksheet name as the primary visual target?
4. Does it reduce noise instead of adding it?
5. Does it respect the Office theme system?
6. Can it be implemented through shared tokens or global selectors first?

If the answer is no to any of the first five questions, the change should be challenged before implementation.

## What is considered complete in this phase

This phase is considered complete because it already established:

- a coherent Office-aligned token system
- a calmer shell and search treatment
- cleaner row hierarchy
- better contextual action discipline
- a clearer distinction between primary, grouped, pinned, and hidden navigation areas
- a documented style philosophy that matches the implementation
- product-owned UI for prompt and confirmation flows (ConfirmDialog, TextPromptDialog)

## What remains outside this phase

The following work is still valid, but belongs to later refinement phases:

- replacing browser prompt flows with product-owned UI
- refining microinteractions and motion
- polishing group visuals until they fully reach the desired quality bar
- validating edge-case rendering across more Office hosts
- expanding the design language without losing restraint

## Source alignment

This baseline must stay aligned with:

- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/design/style-system.md`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/design/ui.md`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/design/ux_flows.md`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/taskpane/styles.css`
- `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/src/taskpane/useOfficeTheme.ts`

## Decision

Future visual improvements must extend this baseline.
They should not reset it, fight it, or dilute it.
