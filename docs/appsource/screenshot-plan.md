# Sheet Navigator AppSource screenshot plan

This plan identifies existing visual assets and the remaining AppSource screenshot capture gap. It does not claim final screenshots are complete.

## Current asset inventory

Existing repository GIF demos in `assets/landing/`:

- `assets/landing/search-light-demo.gif`
- `assets/landing/search-dark-demo.gif`
- `assets/landing/fuzzy-search-light-demo.gif`
- `assets/landing/fuzzy-search-dark-demo.gif`
- `assets/landing/sheet-preview-demo.gif`
- `assets/landing/sheet-preview-dark-demo.gif`
- `assets/landing/groups-light-demo.gif`
- `assets/landing/groups-dark-demo.gif`
- `assets/landing/drag-and-drop-light-demo.gif`
- `assets/landing/drag-and-drop-dark-demo.gif`
- `assets/landing/new-drag-and-drop-light-demo.gif`
- `assets/landing/new-drag-and-drop-dark-demo.gif`

Existing icon assets in `assets/`:

- `assets/icon.svg`
- `assets/icon-16.png`
- `assets/icon-32.png`
- `assets/icon-64.png`
- `assets/icon-80.png`
- `assets/icon-300.png`

## Screenshot requirements to confirm in Partner Center

Microsoft's submission flow requires listing assets including icons and screenshots. Before final upload, confirm the live Partner Center requirements for:

- Required screenshot count.
- Required and accepted image dimensions.
- Accepted file formats and maximum file size.
- Whether animated GIFs are accepted for the selected Office Add-in listing field.
- Localization requirements for screenshots and captions.
- Whether screenshots must show the add-in running inside the actual Excel host frame.

## Required final capture status

The minimum final static screenshot has been captured from a real Excel client:

- Path: `docs/appsource/screenshots/sheet-navigator-overview.png`
- Dimensions: 1366 × 768 px
- Size: 73 KB
- Caption / alt text: "Sheet Navigator shows pinned, grouped, hidden, and regular worksheets in a focused Excel task pane."
- Source note: User-supplied Excel client capture; no sensitive workbook data observed.

Existing GIFs remain useful references and landing-page assets, but live Partner Center image validation must still confirm whether additional images, dimensions, formats, or localized variants are required.

Do not create placeholder screenshot files. Capture any additional final images only from a real Excel client using the submitted production manifest or AppSource package.

## Concrete capture plan

### Workbook setup

Create a clean, non-sensitive workbook with representative worksheet names:

- `Summary`
- `Revenue Jan`
- `Revenue Feb`
- `Expenses`
- `Forecast`
- `Archive`
- `Hidden Notes` hidden from the normal sheet tab row

Add simple sample values to a few sheets so previews are meaningful. Do not include customer, financial, personal, credential, or proprietary data.

### Client setup

Capture from at least one real Excel client. Preferred order:

1. Excel on the web, because it is easiest to access and validates the hosted production manifest.
2. Excel for Windows, if available, to show a desktop host.
3. Excel for Mac, if available, to show macOS host compatibility.

Use the production manifest URL: <https://valentinzurita.github.io/excel-navbar-plugin/excel-navbar-plugin.xml>

### Proposed final static screenshots

1. **Main navigator overview** — captured
   - Path: `docs/appsource/screenshots/sheet-navigator-overview.png`
   - Dimensions: 1366 × 768 px
   - Size: 73 KB
   - Caption / alt text: "Sheet Navigator shows pinned, grouped, hidden, and regular worksheets in a focused Excel task pane."
   - Shows Excel with the Sheet Navigator task pane open.
   - Goal: communicate the main value proposition in one image.

2. **Search workflow** — optional gap
   - Show the search field with a query such as `rev` and matching worksheets.
   - Goal: demonstrate fast worksheet discovery.

3. **Groups workflow** — optional gap
   - Show at least one expanded group and one collapsed group if possible.
   - Goal: demonstrate workbook organization.

4. **Preview workflow** — optional gap
   - Show a worksheet preview triggered from the task pane.
   - Goal: demonstrate preview-before-switching behavior.

5. **Drag-and-drop organization** — optional gap
   - Capture a static moment with a visible drag/drop target only if the screenshot can be taken cleanly from the real host.
   - Goal: demonstrate organization by drag and drop without relying on animated media.

### Caption and alt-text draft

- Main navigator overview: "Sheet Navigator shows pinned, grouped, hidden, and regular worksheets in a focused Excel task pane."
- Search workflow: "Search filters worksheet names so users can jump to the right sheet quickly."
- Groups workflow: "Collapsible groups help organize related worksheets in large workbooks."
- Preview workflow: "Worksheet previews help identify a sheet before switching to it."
- Drag-and-drop workflow: "Visible drop feedback helps users reorganize worksheets from the task pane."

## Quality bar before upload

- Screenshot is captured from an actual Excel client, not a mockup.
- No private workbook data appears.
- The task pane is legible at Partner Center's displayed size.
- Worksheet names are the primary visual target.
- The image does not imply unsupported services, accounts, analytics, collaboration, or automation features.
- The screenshot matches the current product behavior and current legal/privacy claims.
