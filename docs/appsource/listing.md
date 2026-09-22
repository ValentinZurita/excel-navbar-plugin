# Sheet Navigator AppSource listing draft

This file is draft submission material for Microsoft Partner Center. It separates copy that can be pasted into listing fields from account, pricing, and distribution decisions that a human publisher must make in Partner Center.

## Evidence used

- Repository README: product positioning, feature list, installation notes, keyboard shortcuts, license.
- `manifest.template.xml`: display name, provider name, host, permissions, support URL, task pane URL pattern, manifest capabilities.
- Published project URLs in the README and legal pages.
- Current legal pages: `src/landing/privacy.html`, `src/landing/terms.html`, `src/landing/support.html`.
- License file and README license section: Creative Commons Attribution-NonCommercial 4.0 International.

## Proposed copy

### Product title

Sheet Navigator for Excel

### Short summary

Keyboard-first worksheet navigation for Excel workbooks with many sheets.

### Long HTML-ready description

```html
<p>
  <strong>Sheet Navigator for Excel</strong> helps you move through large Excel workbooks without
  losing time in crowded worksheet tabs.
</p>

<p>
  Open the task pane to see a structured worksheet navigator with search, pinned sheets, groups,
  hidden-sheet access, and keyboard-friendly navigation. Sheet Navigator is designed for workbooks
  where the native tab bar becomes hard to scan, especially when a file grows to dozens of
  worksheets.
</p>

<p>Use Sheet Navigator to:</p>
<ul>
  <li>Search worksheets by name with fuzzy matching.</li>
  <li>Switch sheets from a focused sidebar instead of scanning the tab bar.</li>
  <li>Preview a worksheet before activating it.</li>
  <li>Pin frequently used worksheets near the top.</li>
  <li>Organize visible worksheets into collapsible, color-coded groups.</li>
  <li>
    Reorder worksheet entries within Sheet Navigator and move them between navigator groups with
    drag and drop or keyboard-supported flows.
  </li>
  <li>Find and restore hidden worksheets when needed.</li>
</ul>

<p>
  The add-in runs in Excel through Office.js and is built as a local-first utility. It reads
  worksheet names and visibility status to display and organize the active workbook. The current
  privacy policy states that Sheet Navigator does not collect, store, transmit, or share personal
  data, credentials, workbook content, preview images, or identifying information. The task pane is
  statically hosted on GitHub Pages.
</p>

<p>
  Sheet Navigator is licensed under Creative Commons Attribution-NonCommercial 4.0 International (CC
  BY-NC 4.0). You may use, modify, and share it for non-commercial purposes. Commercial use requires
  separate written permission from the rights holder.
</p>
```

### Feature bullets

- Fast worksheet search with fuzzy name matching.
- Keyboard-first task pane navigation for switching sheets quickly.
- Worksheet hover previews to reduce wrong-tab openings.
- Pinned sheets for frequently used tabs.
- Collapsible, color-coded groups for related worksheets.
- Drag-and-drop organization for worksheet entries in Sheet Navigator, including movement between navigator groups, with visible drop feedback.
- Hidden worksheet section for restoring hidden sheets.
- Workbook-local layout persistence using workbook storage or local storage.
- No separate account, purchase flow, telemetry, tracking, or external data store.

### Target audience

- Excel users who work with large or complex workbooks.
- Analysts, finance teams, operations teams, project managers, and spreadsheet-heavy individual contributors.
- Users who prefer keyboard-first workflows.
- Teams that need calmer worksheet organization without sending workbook content to another service.

### Keywords

Excel, worksheet navigator, sheet navigator, worksheets, sheet tabs, workbook organization, Excel add-in, task pane, keyboard shortcuts, fuzzy search, hidden sheets, pinned sheets, worksheet groups, productivity, navigation

### Suggested category and industry

- Suggested category: Productivity.
- Suggested secondary fit: Data analysis / Business tools, if Partner Center requires a narrower marketplace category.
- Suggested industry: Cross-industry / General business productivity.

### Pricing and availability disclosure

Proposed public disclosure:

> Sheet Navigator is available at no charge for non-commercial use under CC BY-NC 4.0. Commercial use is not included in that license and requires separate written permission from the rights holder.

Do not mark a paid purchase, trial, in-app purchase, or account-gated subscription unless a human publisher creates and approves a separate commercial licensing model.

### Legal and support URLs

Use these exact published URLs when the public site is live at the repository URL:

- Product / landing page: <https://valentinzurita.github.io/excel-navbar-plugin/>
- Manifest URL: <https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml>
- Privacy policy: <https://valentinzurita.github.io/excel-navbar-plugin/privacy.html>
- Terms / EULA: <https://valentinzurita.github.io/excel-navbar-plugin/terms.html>
- Support: <https://valentinzurita.github.io/excel-navbar-plugin/support.html>
- GitHub issues support channel: <https://github.com/ValentinZurita/excel-navbar-plugin/issues>
- Repository: <https://github.com/ValentinZurita/excel-navbar-plugin>
- License: <https://github.com/ValentinZurita/excel-navbar-plugin/blob/main/LICENSE>

## Partner Center fields requiring human account decisions

These cannot be completed from repository evidence alone:

- Microsoft Partner Center publisher account, seller profile, and Microsoft 365 and Copilot program enrollment.
- Offer alias, internal offer name, and any publisher-private notes.
- Final market availability, language availability, and rollout timing.
- Whether the offer is listed as free, contact-me, or another Partner Center-supported commercial model.
- Commercial licensing contact/process for users who need permission beyond CC BY-NC 4.0.
- Final AppSource category and industry values if Partner Center's live taxonomy differs from the suggested values above.
- Final icon and screenshot assets uploaded to Partner Center.
- Final certification submission timing.
