# Sheet Navigator certification notes

Draft notes for Microsoft AppSource certification reviewers. Do not include private credentials; Sheet Navigator does not require an app-specific account.

## Manifest and package

- Manifest URL: <https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml>
- Product page: <https://valentinzurita.github.io/excel-navbar-plugin/>
- Host application: Microsoft Excel workbook host.
- Add-in type: Office task pane add-in.
- Manifest display name: `Sheet Navigator`.
- Manifest provider: `Valentin Perez`.
- Manifest permissions: `ReadWriteDocument`.
- Manifest requirements from template: `SharedRuntime` 1.1 and `ExcelApi` 1.1.
- Support URL: <https://valentinzurita.github.io/excel-navbar-plugin/support.html>
- Privacy URL: <https://valentinzurita.github.io/excel-navbar-plugin/privacy.html>
- Terms / EULA URL: <https://valentinzurita.github.io/excel-navbar-plugin/terms.html>

## Account, purchase, and sign-in disclosures

- No Sheet Navigator account is required.
- No Sheet Navigator username, password, tenant, license key, or test credential exists.
- No purchase, subscription, in-app payment, or trial activation is required for the submitted add-in behavior.
- No SSO flow is implemented by the add-in.
- Excel itself may require the reviewer to use a Microsoft account or an organizational account to open Excel, install AppSource add-ins, or sync the add-in between Excel on the web and desktop clients.
- The project is licensed under CC BY-NC 4.0. Non-commercial use is permitted under that license; commercial use requires separate written permission from the rights holder.

## Recommended reviewer workbook

Use a non-sensitive test workbook. To exercise the main features, create at least these worksheets before opening the add-in:

- `Summary`
- `Revenue Jan`
- `Revenue Feb`
- `Expenses`
- `Forecast`
- `Archive`
- One hidden worksheet, for example `Hidden Notes`

Add simple sample values to the visible sheets if you want to evaluate worksheet previews. Do not use private or production workbook content.

## Excel on the web test instructions

1. Open Excel on the web with a reviewer Microsoft account.
2. Create or open the test workbook described above.
3. Install the add-in from the submitted AppSource package or upload the submitted manifest when using certification-side sideloading.
4. Open the task pane from the Sheet Navigator command in the Excel ribbon.
5. Confirm the task pane loads from the published HTTPS GitHub Pages URL.
6. Run the feature test cases below.

## Excel for Windows test instructions

1. Open Excel for Windows with a reviewer Microsoft account.
2. Create or open the test workbook described above.
3. Install the add-in from AppSource, or use the certification-provided installation path for the submitted manifest.
4. Open the Sheet Navigator task pane from the ribbon.
5. Run the feature test cases below.
6. Test Windows shortcuts where host policy allows add-in keyboard shortcuts.

## Excel for Mac test instructions

1. Open Excel for Mac with a reviewer Microsoft account.
2. Create or open the test workbook described above.
3. Install the add-in from AppSource, cloud sync, or the certification-provided installation path for the submitted manifest.
4. Open the Sheet Navigator task pane from the ribbon.
5. Run the feature test cases below.
6. Test macOS shortcuts where host and system shortcut settings allow add-in keyboard shortcuts.

## Keyboard shortcuts

Global add-in shortcuts declared in `shortcuts.json`:

| Action           | Windows              | macOS                      |
| ---------------- | -------------------- | -------------------------- |
| Toggle Navigator | `Ctrl` + `Alt` + `P` | `Command` + `Option` + `P` |
| Focus Search     | `Ctrl` + `Alt` + `O` | `Command` + `Option` + `O` |
| Create Worksheet | `Ctrl` + `Alt` + `N` | `Command` + `Option` + `N` |

Task pane keyboard interactions documented in the README:

| Action                    | Key                        |
| ------------------------- | -------------------------- |
| Navigate list             | `ArrowUp` / `ArrowDown`    |
| Activate sheet            | `Enter`                    |
| Open context menu         | `ArrowRight`               |
| Expand / collapse group   | `ArrowRight` / `ArrowLeft` |
| Pick up / drop sheet      | `Space`                    |
| Jump to first / last      | `Home` / `End`             |
| Clear focus / exit search | `Escape`                   |

## Feature test cases and expected behavior

### 1. Open task pane and list worksheets

Steps:

1. Open the Sheet Navigator task pane.
2. Compare the visible workbook worksheets with the task pane list.

Expected behavior:

- The task pane opens without an account prompt from Sheet Navigator.
- Visible worksheets appear by name in the navigator.
- The active worksheet has a clear visual anchor in the task pane.

### 2. Search worksheets

Steps:

1. Focus the search field.
2. Type part of a worksheet name, such as `rev`.
3. Use `ArrowDown` / `ArrowUp` and `Enter` to activate a result.
4. Press `Escape` to clear or exit the search interaction.

Expected behavior:

- The list filters by worksheet name with fuzzy matching.
- Selecting a result activates the matching Excel worksheet.
- The interaction remains usable with keyboard-only navigation.

### 3. Worksheet preview

Steps:

1. Hover a visible worksheet row in the task pane.
2. Use a workbook sheet that contains sample values.

Expected behavior:

- A bounded local preview of the worksheet appears before switching sheets.
- Preview generation does not require credentials or transmit workbook content through a Sheet Navigator service.

### 4. Pin a worksheet

Steps:

1. Open a worksheet row context menu.
2. Pin a visible worksheet.
3. Confirm it appears in the pinned area.
4. Unpin it.

Expected behavior:

- Pinned worksheets appear near the top for faster access.
- Unpinning returns the worksheet to the normal visible-sheet flow.

### 5. Create and use groups

Steps:

1. Open a worksheet row context menu.
2. Create a group or move a worksheet into a group using available menu actions.
3. Expand and collapse the group.
4. Move at least one visible, unpinned worksheet between a group and the ungrouped list.

Expected behavior:

- Groups are visible as collapsible containers.
- Group membership changes are reflected in the task pane.
- Worksheet names remain readable and are the primary visual target.

### 6. Drag and drop worksheet organization

Steps:

1. Drag a visible, unpinned worksheet row.
2. Move its Sheet Navigator entry within the ungrouped list or into a navigator group.
3. Release on a valid drop target.

Expected behavior:

- The task pane shows drop feedback while dragging.
- The worksheet entry appears in the selected Sheet Navigator location after dropping.
- Moving entries in Sheet Navigator, including between navigator groups, does not change Excel's native worksheet-tab order.
- Pinned and hidden worksheets are not part of the normal drag-and-drop flow.

### 7. Hidden worksheets

Steps:

1. Hide one worksheet through Excel or Sheet Navigator if available.
2. Expand the hidden worksheet section.
3. Restore the hidden worksheet.

Expected behavior:

- Hidden worksheets are discoverable in the hidden section.
- Restoring a hidden worksheet makes it visible in Excel and returns it to the visible worksheet flow.

### 8. Create worksheet shortcut

Steps:

1. Press the platform shortcut for Create Worksheet.
2. Alternatively use the task pane add action when visible.

Expected behavior:

- Excel creates a new worksheet using Excel naming behavior.
- The new worksheet is activated and appears in the navigator.

### 9. Persistence smoke test

Steps:

1. Create a group and pin one sheet in a test workbook.
2. Save the workbook if the host requires it.
3. Close and reopen the workbook.
4. Reopen the task pane.

Expected behavior:

- Layout settings persist when the workbook and host storage support workbook-local persistence.
- If a host context does not keep workbook-local settings, the add-in should remain usable and the workbook worksheets should still list correctly.

## Known limitations and reviewer notes

- Some workbook contexts may keep Sheet Navigator layout only for the current session. The README troubleshooting section asks users to reopen the file and verify whether groups persist.
- Global shortcuts can be affected by Excel host support, browser focus, desktop client behavior, or operating-system shortcut conflicts. On macOS, some combinations may conflict with system shortcuts.
- Excel Desktop installation behavior can depend on AppSource availability, Microsoft account sync, and host policy. The README currently describes web sideloading plus cloud sync for desktop sideload testing.
- The add-in is a worksheet navigation and organization utility. Sheet Navigator drag-and-drop reorders worksheet entries in the task pane and moves them between navigator groups; it does not change Excel's native worksheet-tab order. It is not a collaboration service, workbook backup tool, analytics product, or external storage system.
- The add-in is hosted statically on GitHub Pages, so loading the task pane requires network access to the published site.

## Accessibility notes

- Sheet Navigator is designed for keyboard-first use.
- Core navigation is available through keyboard interactions documented above.
- The visible task pane emphasizes worksheet names and calm Excel-adjacent styling.
- Reviewers should verify focus order, visible focus treatment, keyboard activation, and task pane readability in each Excel host because Office webviews can differ between web, Windows, and Mac.

## Privacy and data handling notes

- The privacy policy states that Sheet Navigator does not collect, store, transmit, or share personal data, user credentials, or identifying information.
- The add-in reads worksheet names and visibility status from the active workbook to display the navigator.
- Groups and layout settings are saved locally using workbook custom properties or local storage.
- Worksheet previews are rendered locally from bounded workbook range data.
- The privacy policy states that no sheet content, cell data, preview image, or workbook structure is transmitted by the add-in.
- The add-in has no telemetry, tracking scripts, third-party analytics, external database, app-specific account system, or SSO flow.
- Static frontend assets are served from GitHub Pages; GitHub may collect standard server logs under GitHub's own privacy statement.
