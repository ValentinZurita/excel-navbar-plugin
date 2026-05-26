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

## What you get

Native Excel tabs get messy fast in large workbooks. Sheet Navigator is a task pane built for **speed, structure, and control**.

| Feature            | What you get                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Sheet preview**  | Hover a sheet to see a live thumbnail before you switch — no more opening the wrong tab.                     |
| **Keyboard-first** | Global shortcuts from anywhere in Excel; inside the pane, navigate, activate, and drag with keys alone.      |
| **Search**         | Fuzzy filter by name — type scattered letters and jump to the right sheet                                    |
| **Groups**         | Collapsible, color-coded folders so related sheets stay together.                                            |
| **Drag & drop**    | Reorder sheets and move them between groups with mouse or keyboard; drop indicators show where they'll land. |

**Also built in**

| Feature           | What you get                                       |
| ----------------- | -------------------------------------------------- |
| **Pinned sheets** | Keep your most-used tabs at the top.               |
| **Context menus** | Rename, pin, hide, delete, and more from one menu. |
| **Saved layout**  | Groups and order travel with the workbook.         |
| **Hidden sheets** | Restore hidden worksheets when you need them.      |

---

## Keyboard shortcuts

### Global (work anywhere in Excel)

| Action        | macOS       | Windows          |
| ------------- | ----------- | ---------------- |
| Toggle panel  | `⌘` `⌥` `P` | `Ctrl` `Alt` `P` |
| Focus search  | `⌘` `⌥` `O` | `Ctrl` `Alt` `O` |
| New worksheet | `⌘` `⌥` `N` | `Ctrl` `Alt` `N` |

### Inside the panel

| Action                    | Key            |
| ------------------------- | -------------- |
| Navigate list             | `↑` `↓`        |
| Activate sheet            | `Enter`        |
| Open context menu         | `→`            |
| Expand / collapse group   | `→` / `←`      |
| Pick up / drop sheet      | `Space`        |
| Jump to first / last      | `Home` / `End` |
| Clear focus / exit search | `Escape`       |

---

## Installation

> You need a Microsoft account (personal or work/school) to sideload add-ins.

Download the manifest once for all platforms:
**[excel-navbar-plugin.xml](https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml)**

### Excel on the Web

1. Open [office.com](https://office.com) → Excel → create or open a workbook.
2. Go to **Home → Add-ins → More Settings**.
3. Select **Upload My Add-in** and choose `excel-navbar-plugin.xml`.

### Excel for Windows & Mac (Desktop)

Excel Desktop does not support direct local manifest upload. The easiest way to install it on desktop is using **Cloud Sync**:

1. Sideload the manifest first in **Excel on the Web** (following the steps above).
2. Open Excel on your Desktop (Windows or Mac) and ensure you are signed in with the same Microsoft account.
3. Go to **Home → Add-ins → My Add-ins**. The add-in will be listed there automatically!

> **Mac Fallback (Manual)**: If Cloud Sync is not an option, close Excel and copy `excel-navbar-plugin.xml` to:
>
> ```
> /Users/<username>/Library/Containers/com.microsoft.Excel/Data/Documents/wef
> ```
>
> _(create the `wef` folder if it does not exist)_.
> Reopen Excel — the add-in appears under **Insert → Add-ins** (click the arrow next to the button) as a **Developer Add-in**.

---

## Troubleshooting

| Problem                        | What to try                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Upload option missing (Mac)    | Use the `wef` folder path above.                                                                                                |
| Blank panel after load         | Check your internet connection — the pane loads from GitHub Pages.                                                              |
| Shortcuts not working          | Click inside the task pane first. On macOS, some combos may conflict with system shortcuts.                                     |
| Manifest validation fails      | Re-download the file from the [landing page](https://valentinzurita.github.io/excel-navbar-plugin/). Do not copy-paste the XML. |
| Layout not saved               | Some workbook contexts only keep layout for the current session. Reopen the file and check whether groups persist.              |
| Local dev: certificate warning | Trust the dev certificate from `office-addin-dev-certs`, or run its install command when prompted.                              |

---

## Development

```bash
pnpm install
pnpm manifest:dev   # creates excel-navbar-plugin.xml for localhost
pnpm dev            # serves at https://localhost:3000
```

Sideload the generated `excel-navbar-plugin.xml` in Excel to test.

```bash
pnpm validate       # typecheck, lint, and tests
pnpm package:release  # production bundle in dist/ (requires ADDIN_BASE_URL)
```

For a release build, set the public URL first:

```bash
ADDIN_BASE_URL=https://valentinzurita.github.io/excel-navbar-plugin pnpm package:release
```

Bug reports and UX feedback are welcome on [GitHub Issues](https://github.com/ValentinZurita/excel-navbar-plugin/issues).

---

## License

Licensed under [Creative Commons Attribution-NonCommercial 4.0](LICENSE).

You may use, modify, and share for non-commercial purposes. Commercial use requires explicit permission.
