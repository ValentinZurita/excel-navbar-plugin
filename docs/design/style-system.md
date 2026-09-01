# Style System Guide

## Purpose

This file is the global style reference for the Sheet Navigator add-in.

The goal is simple:

- keep the UI visually integrated with Excel
- avoid random styling decisions
- give developers one place to understand how styles are organized

This product should feel like a natural worksheet navigator, not a mini web app inside Excel.

For the approved phase baseline and long-term visual direction, also read `docs/design/visual-baseline.md`.

## Source of Truth

### Theme tokens

Primary theme tokens live in:

- `src/taskpane/styles.css`
- `src/taskpane/useOfficeTheme.ts`

`useOfficeTheme.ts` reads the Office host theme and writes runtime CSS variables.

`styles.css` consumes those variables.

### Rule

If a color, background, border, or text contrast issue appears:

1. check `useOfficeTheme.ts`
2. then check the token section at the top of `styles.css`
3. only then adjust individual component selectors

Do not hardcode random colors inside component files unless there is a strong reason.

## Styling Strategy

### Global CSS first

This project uses a **global CSS system with semantic selectors and host theme tokens**.

Why:

- Excel add-in UI is compact and strongly host-dependent
- theme behavior matters more than fancy component-level styling abstractions
- a single global file makes visual cleanup faster for everyone
- the current product is still exploring layout and interaction direction

### Component rule

React components should define:

- structure
- state wiring
- interaction hooks

Global CSS should define:

- visual tokens
- density
- spacing rhythm
- row treatment
- borders
- typography scale
- menu appearance
- hover and active states

## Layout Philosophy

### Core metaphor

The navigator should feel closer to:

- browser tabs
- list navigation
- Excel side navigation

It should feel less like:

- cards
- dashboard widgets
- forms
- islands

### Visual priorities

1. visible worksheet names
2. active state
3. group structure
4. pinned items only when they exist
5. hidden sheets as a secondary layer

### What to avoid

- decorative cards
- shadows that call attention to containers
- help text everywhere
- persistent controls that compete with sheet names
- bright color accents unless product value truly depends on them

## Token Rules

### Current tokens

Defined in `styles.css`:

- `--excel-body-bg`
- `--excel-body-fg`
- `--excel-control-bg`
- `--excel-control-fg`
- `--excel-border`
- `--excel-muted`

### Usage rules

- use `--excel-body-*` for content and shell background/foreground
- use `--excel-control-*` for inputs, menus, and actionable surfaces
- use `--excel-border` for separators and subtle control outlines
- use `--excel-muted` for labels, metadata, and low-priority text

### Do not

- use raw hex values directly in component markup
- invent local color tokens without documenting them here
- create per-component style behavior that ignores the Office theme

## Typography Rules

### Direction

Typography should feel:

- calm
- compact
- useful
- Microsoft-adjacent

### Rules

- worksheet names are the visual priority
- labels should be smaller and quieter than content
- section titles should be minimal, not promotional
- helper text should be removed unless the UI is truly unclear without it

## Interaction Rules

### Menus

The main action surface is the contextual menu.

That means:

- tab rows stay visually clean
- actions appear on right click or `•••`
- no expanding forms below rows unless truly necessary

### Hover

Hover should:

- confirm interactivity
- not repaint the whole UI
- stay subtle

### Active state

Active sheet styling should:

- be visible immediately
- stay understated
- not turn the whole row into a loud button

## Section Rules

### Pinned

- render only when it has content
- never occupy empty visual space

### Tabs

- this is the primary everyday area
- if the user has normal worksheets, this is what they should mainly see

### Groups

- visible only when groups exist
- should feel like structured folders of tabs, not separate products

### Hidden sheets

- lower emphasis
- collapsible via the section header itself
- no noisy controls unless needed

## How to Change the UI Safely

### If you want to improve spacing

Start in:

- `styles.css`

Look first at:

- shell spacing
- row padding
- list gaps
- section header padding

### If you want to improve theme integration

Start in:

- `useOfficeTheme.ts`
- token section in `styles.css`

### If you want to change interactions

Start in:

- `src/ui/taskpane/TaskpaneAppContainer.tsx`
- then the relevant component under `src/ui/components/`

### If you want to add a new visual pattern

Before coding, define:

- why it is needed
- whether it belongs in tokens, shared selectors, or one component only
- whether it makes the UI more native-feeling or more web-like

## Architecture Notes for Styles

### Good

- one global stylesheet as visual source of truth
- Office theme adapter writes CSS variables
- React components stay small and mostly structural

### Bad

- inline styles for normal visual behavior
- local ad-hoc colors in components
- CSS duplicated across components
- visual decisions hidden inside logic files

## Review Checklist

Before accepting a visual change, ask:

1. Does it make the UI feel more like Excel or more like a random web app?
2. Does it reduce or increase visual noise?
3. Does it keep worksheet names as the first thing the eye sees?
4. Does it preserve theme compatibility?
5. Could the same result be achieved by editing tokens or shared selectors instead of adding more one-off styles?

## Current Known Gaps

- inputs still need host-by-host validation in Excel because Office webviews can behave differently from browser previews
- the menu and list hierarchy still need more refinement to fully reach the intended tab-strip feel
- group styling is structurally correct, but not yet at the final visual quality bar
