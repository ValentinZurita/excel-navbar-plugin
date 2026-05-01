# Sheet Navigator for Excel

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Excel Add-in](https://img.shields.io/badge/Platform-Excel%20Add--in-107C41)](https://learn.microsoft.com/office/dev/add-ins/)

A keyboard-first Excel add-in that replaces tab chaos with a fast, structured worksheet navigator.

- **Landing page**: [valentinzurita.github.io/excel-navbar-plugin](https://valentinzurita.github.io/excel-navbar-plugin/)
- **Manifest (sideload)**: [excel-navbar-plugin.xml](https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml)
- **Repository**: [github.com/ValentinZurita/excel-navbar-plugin](https://github.com/ValentinZurita/excel-navbar-plugin)

---

## Why this exists

Native Excel tabs break down fast in workbooks with many sheets. Sheet Navigator gives you a task pane focused on **speed, structure, and control**:

- Group sheets logically
- Find sheets instantly with search
- Reorder and move sheets with drag & drop
- Execute core actions without leaving the keyboard

## Core capabilities

| Capability      | What you get                                          |
| --------------- | ----------------------------------------------------- |
| Grouping        | Collapsible, color-coded groups for large workbooks   |
| Search          | Real-time filtering to jump to a target sheet quickly |
| Drag & drop     | Move sheets across groups with visual feedback        |
| Keyboard-first  | Global shortcuts + directional navigation             |
| Excel-native UX | UI aligned with Office host patterns                  |

## Keyboard shortcuts (high impact)

### macOS

- `⌘ + ⌥ + P` → Toggle panel
- `⌘ + ⌥ + O` → Focus search
- `⌘ + ⌥ + N` → New worksheet
- `Space` → Pick up / drop sheet
- `↑ / ↓` → Navigate list
- `→ / ←` → Expand / collapse groups
- `Enter` → Activate sheet

### Windows

- `Ctrl + Alt + P` → Toggle panel
- `Ctrl + Alt + O` → Focus search
- `Ctrl + Alt + N` → New worksheet
- `Space` → Pick up / drop sheet
- `↑ / ↓` → Navigate list
- `→ / ←` → Expand / collapse groups
- `Enter` → Activate sheet

## Installation (sideload)

1. Download [`excel-navbar-plugin.xml`](https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml).
2. Open Excel.
3. Go to **Insert → Add-ins → Upload My Add-in**.
4. Select the downloaded manifest file.
5. Open **Home** tab and launch **Sheet Navigator**.

## Local development

```bash
npm ci
npm run dev
```

### Validation and quality checks

```bash
npm run test
npm run quality
npm run check:import-cycles
npm run check:knip
```

### Production package

```bash
npm run package:release
```

This generates the production bundle and `dist/excel-navbar-plugin.xml`.

## Tech stack

- React 18 + TypeScript
- Office.js
- Webpack 5
- Vitest + Testing Library
- ESLint + Stylelint + Prettier

## Project status

Actively evolving. Contributions, bug reports, and UX feedback are welcome.

## License

Licensed under [Creative Commons Attribution-NonCommercial 4.0](LICENSE).

You may use, modify, and share for non-commercial purposes. Commercial use requires explicit permission.
