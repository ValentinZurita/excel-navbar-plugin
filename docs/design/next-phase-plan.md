# Next Phase Plan

## Purpose

This document traces the next design and UX refinement phase after the approved visual baseline.

The baseline is already established.
The next phase should deepen quality without changing the product identity.

## Phase goal

Move from visual foundation to interaction refinement.

This means:

- keeping the current calm native-adjacent direction
- replacing weak interaction surfaces
- improving perceived quality in the places users touch most
- increasing product maturity without adding noise

## Priority order

### 1. Replace browser-owned prompts with product-owned UI

Current create/rename flows still rely on browser prompts.

That is the biggest mismatch against the current quality bar because it breaks:

- visual continuity
- host alignment
- trust in the product
- control over microcopy and validation

Expected direction:

- small inline flows or lightweight dialogs
- clear validation states
- no heavy modal system unless truly needed

### 2. Refine contextual actions

Context menus are now the right interaction direction.
The next step is refining their feel and completeness.

Focus on:

- clearer grouping of actions
- better destructive-action signaling
- keyboard and focus behavior
- tighter alignment between row state and available actions

### 3. Raise group quality to the same bar as primary sheets

Groups are structurally correct, but they still have room to feel more premium and more intentional.

Focus on:

- header rhythm
- indentation discipline
- collapsed vs expanded clarity
- relationship between group identity and contained sheets

### 4. Polish search as a premium interaction

Search is one of the highest-value surfaces in this product.
It should feel immediate, obvious, and calm.

Focus on:

- result clarity
- keyboard flow
- better empty state wording
- stronger sense of quick-switch behavior

### 5. Validate across Office hosts

A visual direction is only real if it survives host differences.

Focus on:

- input rendering
- contrast
- menu behavior
- sticky search behavior
- spacing and overflow edge cases

## Suggested work packages

### Package A — Interaction ownership

- replace `window.prompt(...)` flows
- define reusable lightweight interaction pattern
- keep implementation visually consistent with baseline

### Package B — Context menu quality

- refine menu information hierarchy
- audit wording and action grouping
- improve focus and hover behavior

### Package C — Group refinement

- polish grouped-sheet presentation
- ensure groups feel integrated, not like a second product

### Package D — Search refinement

- improve result feedback
- strengthen quick-switch feel
- review search empty and no-result states

### Package E — Host validation

- verify dark/light behavior in real Office hosts
- capture visual mismatches and feed them back into tokens/selectors

## Rules for this phase

- No dashboard drift.
- No visual chrome for its own sake.
- No new pattern without a reason.
- No component-level styling shortcuts if tokens/shared selectors can solve it.
- Every refinement must make scanning, clarity, or trust better.

## Success criteria

This phase is successful when:

- product-owned interactions replace browser prompts
- search and contextual actions feel deliberate and cohesive
- groups no longer feel like the weakest visual area
- host validation finds only minor visual exceptions
- the UI feels more mature without feeling heavier

## Immediate next recommendation

Start with interaction ownership first.

Replacing browser prompts will produce the biggest visible quality jump for the least conceptual risk because it improves polish without changing the baseline direction.
