# Sheet Navigator

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

A modern worksheet navigator for Excel. Organize, search, and move between sheets using a fast task pane built for keyboard-first workflows.

**[Install →](https://valentinzurita.github.io/excel-navbar-plugin/)**

---

## Why

Excel's built-in sheet tab bar becomes painful with more than a dozen worksheets. Sheet Navigator replaces it with a task pane that supports grouping, search, drag-and-drop reordering, and full keyboard control.

## Features

- **Groups** — Organize sheets into collapsible groups to reduce visual clutter.
- **Search** — Jump to any worksheet instantly with live filtering.
- **Drag & Drop** — Reorder sheets and move them between groups visually.
- **Keyboard-first** — Navigate, rename, hide, and switch sheets without touching the mouse.
- **Excel-native feel** — Visual quality aligned with the Office host, not a generic web app.

## Screenshots

*(Add screenshots or a short GIF here showing the task pane in action.)*

## Installation

1. Download the [`manifest.xml`](https://valentinzurita.github.io/excel-navbar-plugin/manifest.xml) file.
2. In Excel, go to **Insert → Add-ins → Upload My Add-in**.
3. Select the downloaded `manifest.xml` and confirm.
4. The **Sheet Navigator** button appears in the **Home** tab.

For detailed instructions, visit the [project site](https://valentinzurita.github.io/excel-navbar-plugin/).

## Tech Stack

- **React 18** + **TypeScript**
- **Office.js** for Excel integration
- **Webpack** for bundling
- **Vitest** + **Testing Library** for unit and component tests
- **GitHub Pages** for static hosting

## Local Development

```bash
# Install dependencies
npm ci

# Start the dev server (serves over HTTPS for Excel sideloading)
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Contributing

Contributions are welcome. Please open an issue or pull request if you find a bug or have an idea for improvement.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](LICENSE).

You are free to use, modify, and share this project for non-commercial purposes. Commercial use is not permitted without explicit permission.

## Links

- **Project site**: https://valentinzurita.github.io/excel-navbar-plugin/
- **Manifest**: https://valentinzurita.github.io/excel-navbar-plugin/manifest.xml
- **Repository**: https://github.com/ValentinZurita/excel-navbar-plugin
