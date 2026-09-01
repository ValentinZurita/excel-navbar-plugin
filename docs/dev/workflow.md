# Development & Git Workflow

> **Scope**: `excel-navbar-plugin` engineering standards and branch lifecycle.

This document details the branch strategy, environment progression, PR requirements, and release lifecycle.

---

## 1. Branching Strategy

We follow a structured **Trunk-Based with Integration (develop) & Stable (main)** model:

```
[ feat/* | fix/* ]  ──(PR / squash)──>  [ develop ]  ──(Release PR)──>  [ main ] (Production)
```

### Branch Definitions

| Branch | Purpose | Base Branch | Target Merge | CI & Deployment |
|---|---|---|---|---|
| `main` | Production release. Stable, deployable code. | — | — | Runs `Quality` + Deploys to GitHub Pages (`deploy-pages.yml`). |
| `develop` | Integration branch. Active development integration. | `main` | `main` | Runs full `Quality` validation pipeline. |
| `feat/<name>` | New feature development. | `develop` | `develop` | Runs local pre-commit & PR Quality checks. |
| `fix/<name>` | Bug fixes and regressions. | `develop` | `develop` | Runs local pre-commit & PR Quality checks. |
| `hotfix/<name>` | Urgent production bug fixes. | `main` | `main` & `develop` | Runs Quality + Deploys to production. |
| `release/vX.Y.Z`| Version bump & release preparation. | `develop` | `main` & `develop` | Manifest production validation. |

---

## 2. Environments & Tooling

We support distinct development, staging, and production configurations via `addin-config.json` and `scripts/switch-env.mjs`:

| Environment | Base URL | How to Activate | Use Case |
|---|---|---|---|
| **Development** (`dev`) | `https://localhost:3000` | `pnpm switch:dev` then `pnpm dev` | Local live-reload development with self-signed dev certs. |
| **Production** (`prod`) | `https://valentinzurita.github.io/excel-navbar-plugin` | `pnpm switch:prod` | Production manifest pointing to hosted GitHub Pages. |

---

## 3. Pull Request Protocol

1. **Branch off `develop`**: `git checkout develop && git checkout -b feat/my-feature`.
2. **Local Validation**: Always run `pnpm validate && pnpm quality` before creating a PR.
3. **Commit Quality**: Enforce Conventional Commits (`feat(scope): ...`, `fix(scope): ...`). No AI attribution.
4. **Squash & Merge**: Merge into `develop` with a clean, concise commit message.

---

## 4. Release Lifecycle (SemVer)

1. Create a branch: `git checkout -b release/vX.Y.Z develop`.
2. Update versions in `package.json` and verify `manifest.template.xml`.
3. Verify release readiness:
   ```bash
   ADDIN_BASE_URL=https://valentinzurita.github.io/excel-navbar-plugin pnpm package:release
   ```
4. Open PR to `main`. Once merged:
   - Tag the release: `git tag vX.Y.Z && git push origin vX.Y.Z`.
   - Merge `main` back into `develop` to synchronize version bump.
   - GitHub Actions deploys the production bundle to GitHub Pages.
