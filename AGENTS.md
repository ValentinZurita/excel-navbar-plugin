# AGENTS.md

## Mission

Build and maintain an Excel worksheet navigator that feels calm, native-adjacent, and reliable inside Excel.

## Tech context

- **Stack**: React 18, TypeScript 5.7 (strict), Webpack 5, Office.js, Vitest
- **Package manager**: pnpm (never use `npm run`)
- **Architecture**: Clean/Hexagonal — `src/domain/` (entities, rules), `src/application/` (use cases), `src/infrastructure/` (Office.js adapters, persistence), `src/ui/` (React components)
- **Tests**: Vitest + Testing Library, located in `tests/` mirroring `src/` structure
- **Build output**: `dist/` (do not commit)

## Mandatory rules

- Never remove, untrack, or add to `.gitignore` the `.engram/` directory or its tracked files unless the human explicitly requests it. CI enforces this via `pnpm check:engram-protected`.
- Ask the human when a meaningful product or technical doubt remains.
- Do not claim a feature works unless it was verified.
- Keep language simple when speaking to the human reviewer.
- Use descriptive English names in code and files.
- Keep files small and obvious. Avoid monolithic React components.
- Keep presentation components free of business logic. Put Office.js access in adapters/services, not in components.
- Treat UX quality and Excel alignment as core functionality, not later polish.

## Design non-negotiables

- Extend the current design direction; do not reset it, dilute it, or introduce conflicting visual language.
- Keep worksheet names as the primary visual target. Controls and metadata must stay secondary.
- Prefer calm, native-adjacent Excel UI over generic web-app patterns.
- Avoid decorative cards, loud shadows, promotional headers, and persistent controls that compete with navigation.
- Prefer contextual actions and shared tokens/selectors over ad-hoc component styling.
- If a visual change increases noise or feels less Excel-aligned, stop and rethink it before implementation.

## Architecture rules

- **Domain** (`src/domain/`): Pure business logic. No React, no Office.js, no side effects.
- **Application** (`src/application/`): Use cases and orchestration. Can call domain and infrastructure.
- **Infrastructure** (`src/infrastructure/`): External concerns — Office.js, storage, API calls. Keep thin.
- **UI** (`src/ui/`): React components. Presentation only. Business logic lives in domain/application.
- No circular imports. CI checks this via `pnpm check:import-cycles`.
- Office.js types are global (`Office`), but access must go through infrastructure adapters.

## Workflow

### Before you start

1. **Understand the scope**: bug, feature, refactor, or docs?
2. **Find related code**: Search `src/` and `tests/` for files matching the task.
3. **Run tests first**: `pnpm test` to establish a baseline. If they fail, tell the human before changing anything.
4. **Check existing patterns**: Look at similar features/tests to match the project's style.
5. **Plan your change**: Explain what you'll do and why before writing code.

### Stop and ask

- You are unsure about product behavior or UX intent.
- A change would touch more than 5 files or affect public APIs.
- You need to introduce a new dependency.
- Tests fail after your changes and you cannot fix them quickly.
- You are considering architectural changes (moving files between layers, new abstractions).
- The task contradicts existing design non-negotiables or architecture rules.

### If you are blocked

- Stop and ask the human. Do not guess or assume.

## Testing philosophy

- **New logic must have tests**. If you add or change logic in `src/`, add or update tests in `tests/`.
- Prefer unit tests for domain/application logic.
- Use integration tests for Office.js interactions (mocked).
- Run `pnpm test` after meaningful changes. Run `pnpm validate` before finishing.
- Do not skip failing tests. Fix them or ask the human.

## Commit convention

We follow Conventional Commits enforced by commitlint.

### Format

```
<type>[(optional scope)]: <description>

[optional body]

[optional footer(s)]
```

### Rules

- **Type is required** and must be one of: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`.
- **Scope is optional** but preferred when touching a specific area. Allowed scopes: `ui`, `navigation`, `persistence`, `excel`, `design`, `dev`, `tooling`, `docs`.
- **Subject** (description line) must be:
  - lowercase
  - max 72 characters
  - no trailing period
  - imperative mood ("add" not "added", "fix" not "fixed")
- **Body** (optional): explain what and why, not how. Wrap at 72 chars. Separate from subject with a blank line.
- **Breaking changes**: append `!` after type/scope or add `BREAKING CHANGE:` footer.

### Type reference

| Type       | When to use                                             | Example                                                   |
| ---------- | ------------------------------------------------------- | --------------------------------------------------------- |
| `feat`     | New feature or capability                               | `feat(navigation): add keyboard shortcut for sheet focus` |
| `fix`      | Bug fix                                                 | `fix(ui): resolve layout shift on hover`                  |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor(domain): simplify sheet ordering logic`         |
| `style`    | Formatting, missing semicolons, etc. (no logic change)  | `style(ui): format trailing commas in SortableRow`        |
| `docs`     | Documentation only changes                              | `docs(readme): update installation steps`                 |
| `test`     | Adding or correcting tests                              | `test(navigation): add coverage for edge case in move`    |
| `chore`    | Build process, tooling, dependencies, etc.              | `chore(tool): bump eslint to v9`                          |

### What NOT to do

- Do not batch unrelated changes into a single commit.
- Do not use generic messages like `update`, `fix`, or `changes`.
- Do not exceed 72 chars in the subject line.
- Do not end the subject with a period.

## Quality pipeline

### Local hooks

**pre-commit** (fast, staged-only)

- Runs automatically on every commit.
- Executes `pnpm check:secrets` then `pnpm exec lint-staged`.
- lint-staged lints and formats only staged files: TS/JS via ESLint --fix, CSS via stylelint --fix, MD via markdownlint --fix.
- If it fails, fix the errors and retry the commit. Do not suggest `--no-verify` unless the human explicitly asks for an emergency bypass.

**pre-push** (heavy but reasonable)

- Runs automatically on every push.
- By default: `pnpm typecheck && pnpm test`.
- Optional build check: set `BUILD_CHECK=1` to also run `pnpm build`.
- If it fails, fix the errors before pushing.

**commit-msg**

- Validates the commit message against `commitlint.config.mjs`.
- Enforces Conventional Commits, max header length 72, and allowed scopes.

### Scripts every agent should know

| Script           | When to run                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm validate`  | Before proposing a commit or finishing a task. Runs typecheck + lint + test.                                       |
| `pnpm quality`   | Before opening a PR or when touching styles/docs. Runs architecture checks, CSS/MD lint, format check, and ESLint. |
| `pnpm format`    | When files look misformatted. Runs Prettier --write on the entire repo.                                            |
| `pnpm lint:fix`  | When ESLint reports auto-fixable issues.                                                                           |
| `pnpm typecheck` | When TypeScript types may have changed.                                                                            |
| `pnpm test`      | When logic or tests change. Runs Vitest.                                                                           |

### CI behavior

- **quality.yml** runs on every push to `main` and every pull request.
- It installs pnpm, runs the full validation suite (lockfile sync, audit, typecheck, lint, secret scan, tests with coverage, import cycles, quality checks, knip, Office.js API checks, mock drift, build, bundle size gate, manifest validation, bundle analyzer).
- **deploy-pages.yml** builds and deploys to GitHub Pages on every push to `main`.

### Bypass policy

- `--no-verify` is an emergency escape hatch, not a routine workflow.
- Never suggest it to the human unless there is a genuine emergency (e.g., fixing a broken main at 3 AM).
- If used, the agent must still ensure the code passes `pnpm validate` in a follow-up step.

## Development workflow

### Start the project

```bash
pnpm dev      # Webpack dev server on https://localhost:3000 (with Office Add-in dev certs)
```

The dev server:

- Serves on `https://localhost:3000`
- Generates the dev manifest automatically
- Uses self-signed certs via `office-addin-dev-certs`
- To test in Excel: sideload the generated `excel-navbar-plugin.xml` manifest

### Build for production

```bash
pnpm build    # Production bundle in dist/
pnpm manifest:prod   # Generate production manifest with correct base URL
```

Before deploying:

1. Ensure `ADDIN_BASE_URL` env var is set (e.g., `https://valentinzurita.github.io/excel-navbar-plugin`)
2. Run `pnpm build && pnpm manifest:prod`
3. Verify `dist/` contains the bundle and `excel-navbar-plugin.xml`

### Switch environments

```bash
pnpm switch:dev   # Switch to development Office.js environment
pnpm switch:prod  # Switch to production Office.js environment
```

## Documentation rules

- If you change behavior, update the relevant docs or comments.
- If you add a feature, ensure it is discoverable (README, inline docs, or tests as examples).
- If docs and code disagree, the code is wrong. Fix the code or update the docs — never leave them out of sync.
- Leave purposeful comments when intent is not obvious.
- Navigate by folders and clear boundaries.
