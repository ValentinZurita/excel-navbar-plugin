# Sheet Navigator

Modern Excel worksheet navigation as a task pane add-in.

## Product focus

- Fast worksheet discovery
- Manual groups
- Pinned sheets
- Hidden sheet awareness
- Excel-aligned visual quality from day one

## Architecture rules

- React + TypeScript
- Small components
- Presentational UI stays light
- Office.js lives outside UI
- One navigation store for workbook state
- Meaningful persistence only

## Scripts

- `npm run dev` — start local webpack dev server
- `npm run build` — create production bundle in `dist/`
- `npm run lint` — type-check the project
- `npm run test` — run unit/component tests
- `npm run quality` — run architecture/style/docs quality gates
- `npm run manifest:dev` — regenerate local `manifest.xml` with `https://localhost:3000`
- `npm run package:release` — release packaging flow (`ADDIN_BASE_URL` required)

## Release packaging

Use a non-localhost HTTPS domain:

```bash
ADDIN_BASE_URL=https://addins.example.com npm run package:release
```

This command:

1. validates release URL constraints
2. builds production assets
3. renders `dist/manifest.xml` from `manifest.template.xml`

## Important note

This repository was scaffolded intentionally without running a build in this session, following the local project rule.
