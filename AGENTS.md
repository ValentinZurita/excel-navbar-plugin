# AGENTS.md

## Mission & Governance

Build and maintain a calm, keyboard-first, native-adjacent Excel worksheet navigator.
All architectural, performance, and UX invariants are governed by the [Supreme Engineering Constitution](docs/constitution.md).

## Architecture (Clean / Hexagonal)

- **Domain** (`src/domain/`): Pure business logic and state. No React, Office.js, or side effects.
- **Application** (`src/application/`): Use cases, hooks, coordinators. Orchestrates domain and infrastructure.
- **Infrastructure** (`src/infrastructure/`): Office.js adapters, storage, external APIs. All Office access goes through adapters.
- **UI** (`src/ui/`): Pure presentation React components. Zero business logic.
- **Cycles**: 0 circular imports enforced by `pnpm check:import-cycles`.

## Non-Negotiable Rules

1. **Engram Protection**: Never delete, untrack, or add `.engram/` to `.gitignore`. CI enforces `pnpm check:engram-protected`.
2. **Attribution & Commits**: Never add "Co-Authored-By" or AI attribution. Use strict Conventional Commits (`type(scope): subject` under 72 chars).
3. **Build Rule**: Never run build after changes unless explicitly requested.
4. **Design Primacy**: Worksheet names are the primary visual target. Calm, native-adjacent Excel styling. Zero decorative noise or heavy modals.
5. **Zero Leaks**: Long-lived Office.js subscriptions require dedicated `RequestContext` and guaranteed teardown on unmount.
6. **Verification First**: Never claim a feature works without verifying. Run tests before and after changes.

## Git & Branching Strategy

See full details in [Development Workflow](docs/dev/workflow.md).

- **`main`**: Production stable branch. Deploys to GitHub Pages via `deploy-pages.yml`.
- **`develop`**: Central integration branch. All `feat/*` and `fix/*` branches branch from and merge into `develop`.
- **PRs**: Require all CI quality gates passing before merge.

## Core Scripts & Quality Pipeline

| Script             | Purpose                                                            | When to Run                                    |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------- |
| `pnpm validate`    | Typecheck + Lint + Vitest (460+ tests)                             | Before every commit or task completion.        |
| `pnpm quality`     | Engram check + component imports + CSS/MD lint + Prettier + ESLint | Before PR creation or touching styles/docs.    |
| `pnpm dev`         | Start Webpack dev server (`https://localhost:3000`)                | During local feature development on `develop`. |
| `pnpm switch:dev`  | Point manifest & Excel WEF to `localhost:3000` (Dev)               | When testing local changes in desktop Excel.   |
| `pnpm switch:prod` | Point manifest & Excel WEF to GitHub Pages (Prod)                  | When validating live production builds.        |

> **Note on Environment Switching**: After running `pnpm switch:dev` or `pnpm switch:prod`, fully restart Excel (`Cmd+Q` on macOS) so Excel reloads the active manifest from its WEF folder.


## Documentation Rules

- Update docs when behavior changes. If code and docs disagree, the code is wrong. Fix or sync immediately.
- Keep components small and focused. Avoid monolithic files.
