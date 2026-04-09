# Commit Guide

## Purpose
This project is AI-first in execution, so commits must be predictable, readable, and review-friendly.

The goal is not to create many commits for vanity.
The goal is to create **small, meaningful, traceable commits** that a human can understand quickly.

## Core Rules
- Use **conventional commits** only
- One concern per commit
- Do not mix visual refactor + domain logic + tooling changes in the same commit unless they are inseparable
- Prefer smaller commits over giant mixed commits
- A commit must describe a real unit of progress
- If the work was not verified, do not commit it as if it were done

## Allowed Commit Types
- `feat`: new user-facing functionality
- `fix`: bug fix
- `refactor`: internal code improvement without changing intended behavior
- `style`: visual/UI styling changes only
- `docs`: documentation only
- `test`: tests only
- `chore`: maintenance/config/setup work

## Preferred Commit Strategy For This Project

### Visual and UX work
Use:
- `style(ui): ...` for visual-only changes
- `refactor(ui): ...` if interaction structure was reorganized without changing the product scope
- `fix(ui): ...` if correcting broken or misleading behavior in the interface

Examples:
- `style(ui): flatten task pane visual hierarchy`
- `style(ui): align navigator colors with Office theme`
- `fix(ui): keep search input readable in Excel webview`
- `refactor(ui): move tab actions into context menu`

### Navigation behavior work
Use:
- `feat(navigation): ...`
- `fix(navigation): ...`
- `refactor(navigation): ...`

Examples:
- `feat(navigation): add pinned worksheets section`
- `fix(navigation): prevent grouped sheets from being pinned`
- `refactor(navigation): centralize worksheet grouping rules`

### Persistence work
Use:
- `feat(persistence): ...`
- `fix(persistence): ...`
- `refactor(persistence): ...`

Examples:
- `feat(persistence): save workbook navigation metadata`
- `fix(persistence): restore prior sheet state after unhide`

### Docs and process work
Use:
- `docs(...): ...`
- `chore(...): ...`

Examples:
- `docs(design): add global style system guide`
- `docs(dev): add commit guide for AI workflow`
- `chore(tooling): split webpack tsconfig from lint config`

## Scope Guidance
Use scopes when they help a human understand impact quickly.

Recommended scopes:
- `ui`
- `navigation`
- `persistence`
- `excel`
- `design`
- `dev`
- `tooling`
- `docs`

Do not invent clever scopes that nobody will remember.

## Commit Message Formula
Use this structure:

```text
<type>(<scope>): <short clear summary>
```

Good:
- `style(ui): reduce visual chrome in worksheet list`
- `fix(excel): disable webpack overlay for task pane debugging`
- `docs(design): document style tokens and layout rules`

Bad:
- `update stuff`
- `more changes`
- `fixes`
- `wip`
- `trying things`

## What The AI Must Do Before Committing
Before creating a commit, the AI should confirm:
1. what changed
2. why it changed
3. whether it was verified
4. whether unrelated changes are being mixed accidentally

If unrelated changes are present, split them first.

## Commit Size Guidance
A commit is probably too big if:
- it changes product behavior and styling and architecture and docs all at once
- the human cannot summarize it in one sentence
- rollback would be painful because multiple concerns are bundled together

## Current Recommended Style While UX Is In Progress
Right now the project is heavily iterating on visual quality.

That means the most likely valid commit types for the next period are:
- `style(ui): ...`
- `fix(ui): ...`
- `refactor(ui): ...`
- `docs(design): ...`

Avoid pretending a visual cleanup is a `feat` unless the user-facing capability actually changed.

## Human Review Rule
Before the AI proposes or creates a commit, it should explain in simple language:
- what changed
- why it matters
- what type of commit it plans to use

## Example Commit Sequence
A healthy sequence for the current phase could look like:
1. `style(ui): flatten worksheet navigator layout`
2. `fix(ui): correct search field colors in Excel host`
3. `refactor(ui): move tab actions into context menu`
4. `docs(design): add style system guide`
5. `docs(dev): add commit guide for AI workflow`

## Hard Rules
- Never use `WIP`
- Never use vague summaries
- Never hide major changes inside `chore`
- Never commit unverified claims as completed work
- Never mix unrelated fixes just because they were touched in the same session
