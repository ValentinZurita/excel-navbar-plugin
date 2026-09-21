# AppSource legal pages

## Goal

Publish public privacy, terms, and support pages required for Microsoft AppSource.

## Tasks

- [x] Add public privacy page
- [x] Add public terms page
- [x] Add public support page and landing links
- [x] Update deployment and verify release output

## Evidence

- Manifest rendered to a temporary production URL and passed `office-addin-manifest validate`.
- Public manifest support URL is `https://valentinzurita.github.io/excel-navbar-plugin/support.html`.
- `stylelint src/landing/legal.css` passed.
- Prettier checks passed for HTML, CSS, JavaScript/config, and Markdown files using explicit parsers where needed.
- Production build was intentionally not run per repository instructions.

## QA remediation tasks

- [x] Align the release workflow with pnpm.
- [x] Clarify local preview processing and Google Fonts disclosure.
- [x] Add static checks for legal assets and manifest support URL.
- [x] Clarify the non-commercial license in the public terms page.

## QA remediation evidence

- `node --check scripts/check-appsource-assets.mjs` passed.
- `pnpm exec eslint scripts/check-appsource-assets.mjs` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed: 40 files and 461 tests.
- `pnpm exec prettier --check .github/workflows/release.yml .github/workflows/quality.yml src/landing/privacy.html src/landing/terms.html scripts/check-appsource-assets.mjs package.json odd/tasks/appsource-legal-pages.md` passed.
- `pnpm exec prettier --check --parser markdown odd/appsource-legal-pages/tasks` passed.
- `pnpm exec stylelint src/landing/legal.css` passed.
- Temporary production manifest rendered with `https://ci.example.com` and passed `office-addin-manifest validate`; SupportUrl matched `https://ci.example.com/support.html`.
- `ADDIN_BASE_URL=https://valentinzurita.github.io/excel-navbar-plugin pnpm package:release` passed; webpack emitted the production bundle and manifest with only bundle-size performance warnings.
- `ADDIN_BASE_URL=https://valentinzurita.github.io/excel-navbar-plugin pnpm run check:appsource-assets` passed.
- `pnpm run manifest:validate` passed.
- Generated `dist/` contains non-empty legal pages, legal CSS, landing page, and manifest.
