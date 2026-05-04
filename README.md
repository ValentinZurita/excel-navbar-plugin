# Sheet Navigator for Excel

<p align="center">
  <img src="assets/icon.svg" alt="Sheet Navigator logo" width="80">
</p>

<p align="center">
  <a href="https://creativecommons.org/licenses/by-nc/4.0/"><img src="https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg" alt="License: CC BY-NC 4.0"></a>
  <a href="https://learn.microsoft.com/office/dev/add-ins/"><img src="https://img.shields.io/badge/Platform-Excel%20Add--in-107C41" alt="Excel Add-in"></a>
</p>

<p align="center">
  A keyboard-first Excel add-in that replaces tab chaos with a fast, structured worksheet navigator.
</p>

- **Landing page**: [valentinzurita.github.io/excel-navbar-plugin](https://valentinzurita.github.io/excel-navbar-plugin/)
- **Download manifest**: [excel-navbar-plugin.xml](https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml)
- **Repository**: [github.com/ValentinZurita/excel-navbar-plugin](https://github.com/ValentinZurita/excel-navbar-plugin)

---

## Table of Contents

- [Why this exists](#why-this-exists)
- [Features](#features)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Installation](#installation)
  - [Excel on the Web](#excel-on-the-web)
  - [Excel for Windows](#excel-for-windows)
  - [Excel for Mac](#excel-for-mac)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Project status](#project-status)
- [License](#license)

---

## Why this exists

Native Excel tabs break down fast in workbooks with many sheets. Sheet Navigator gives you a task pane focused on **speed, structure, and control**:

- **Collapsible groups** — Organize sheets into color-coded folders
- **Fuzzy search** — Instantly jump to any sheet with real-time filtering
- **Drag & drop** — Reorder and move sheets across groups with visual drop indicators
- **Keyboard-first** — Navigate, rename, hide, and switch sheets entirely from your keyboard
- **Excel-native UX** — UI aligned with Office host patterns

---

## Features

| Feature | What you get |
|---------|-------------|
| **Collapsible Groups** | Color-coded folders to organize large workbooks logically |
| **Fuzzy Search** | Real-time filtering to jump to any sheet instantly |
| **Drag & Drop** | Move sheets between groups with visual feedback |
| **Keyboard-First** | Global shortcuts + directional navigation — never reach for the mouse |
| **Excel-Native UX** | Task pane UI that feels like part of Office |

---

## Keyboard shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| Toggle panel | `⌘` `⌥` `P` | `Ctrl` `Alt` `P` |
| Focus search | `⌘` `⌥` `O` | `Ctrl` `Alt` `O` |
| New worksheet | `⌘` `⌥` `N` | `Ctrl` `Alt` `N` |
| Pick up / drop sheet | `Space` | `Space` |
| Navigate list | `↑` `↓` | `↑` `↓` |
| Open context menu | `→` | `→` |
| Expand / collapse group | `→` `←` | `→` `←` |
| Activate sheet | `⏎` | `⏎` |

---

## Installation

> **Prerequisite**: You need a Microsoft account (personal or work/school) to sideload add-ins.

All platforms use the same manifest file:
**[Download `excel-navbar-plugin.xml`](https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml)**

### Excel on the Web

1. Go to [office.com](https://office.com) and open Excel in your browser.
2. Create or open a workbook.
3. Click **Home → Add-ins → More Settings**.
4. Select **Upload My Add-in**.
5. Choose `excel-navbar-plugin.xml` and upload.

### Excel for Windows

1. Open Excel Desktop and create a blank workbook.
2. Go to **Home → Add-ins → My Add-ins**.
3. Choose **Manage My Add-ins → Upload My Add-in**.
4. Select `excel-navbar-plugin.xml` and upload.
5. The Sheet Navigator task pane will open automatically.

### Excel for Mac

1. Open Excel and create a blank workbook.
2. Go to **Home → Add-ins → My Add-ins**.
3. Select **Manage My Add-ins → Upload My Add-in**.
4. Choose `excel-navbar-plugin.xml` and upload.

> **Note for Mac users**: If the upload option does not appear, close Excel and copy `excel-navbar-plugin.xml` to:
> ```
> /Users/<username>/Library/Containers/com.microsoft.Excel/Data/Documents/wef
> ```
> Then reopen Excel. The add-in will appear in the **Developer** section.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Upload My Add-in" option is missing (Mac) | Copy the manifest to the `wef` folder manually. See [Excel for Mac](#excel-for-mac) above. |
| Add-in loads but shows a blank panel | Check your internet connection. The task pane is a web app served from GitHub Pages. |
| Keyboard shortcuts don't work | Ensure the task pane is focused. Some shortcuts may conflict with system shortcuts on macOS. |
| Manifest validation fails | Download the manifest again from the [landing page](https://valentinzurita.github.io/excel-navbar-plugin/). Do not copy-paste the raw XML. |

---

## Development

### Quick start

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

---

## Project status

Actively evolving. Contributions, bug reports, and UX feedback are welcome.

---

## License

Licensed under [Creative Commons Attribution-NonCommercial 4.0](LICENSE).

You may use, modify, and share for non-commercial purposes. Commercial use requires explicit permission.
