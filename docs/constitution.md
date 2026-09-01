# Supreme Engineering Constitution

> **Status**: Immutable Governance
> **Scope**: `excel-navbar-plugin` (Sheet Navigator for Excel)

This Constitution defines the non-negotiable engineering laws, architectural boundaries, UX principles, and quality invariants of the Sheet Navigator project. All human contributors and AI agents must comply with these articles without exception.

---

## Article I — Sovereign Domain Invariants

1. **Layer Purity**: The Domain layer (`src/domain/`) is sovereign and pure. It MUST NOT import React, Office.js, Webpack, DOM APIs, or any third-party UI framework.
2. **Deterministic State**: State transitions (reducers, domain actions, entity manipulations) MUST be deterministic, side-effect-free, and fully unit-testable in isolation.
3. **Model Decoupling**: Visual layout states (groups, pinned items, collapsed state) MUST remain decoupled from native Excel worksheet data models.

---

## Article II — Office.js Runtime & Webview Hardening

1. **Isolation of External Access**: Direct interaction with `Excel.run` and `Office.*` APIs MUST be strictly encapsulated within `src/infrastructure/office/`. Components and use cases interact only through abstract adapter interfaces (`WorkbookAdapter`).
2. **Dedicated Context for Subscriptions**: Any long-lived event subscription (`onAdded`, `onDeleted`, `onActivated`, etc.) MUST use an independent `Excel.RequestContext` to prevent `RichApi.Error` during document mutations.
3. **Guaranteed Teardown**: Every event listener, observer, and timer MUST provide a synchronous or idempotent teardown function that executes cleanly on unmount/dispose without throwing exceptions.
4. **Host Parity**: Code MUST function reliably across all supported Office webview hosts:
   - macOS: WebKit / Safari webview (`com.microsoft.Excel`)
   - Windows: Microsoft Edge WebView2 (Chromium)
   - Web: Isolated `<iframe>` on `office.com`

---

## Article III — Performance SLAs & Zero-Leak Guarantees

1. **Metadata-Only Queries**: Workbook synchronization MUST only load lightweight metadata properties (`id`, `name`, `visibility`, `position`). Loading cell ranges or formula data during list rendering is strictly prohibited.
2. **Bounded Preview Window**: Worksheet preview generation MUST clamp the captured range to a fixed window (maximum 20 rows × 10 columns) and persist thumbnails in an LRU cache with structural invalidation.
3. **Zero-Allocation Hot Paths**: High-frequency user interactions (keyboard list navigation, fuzzy search filtering) MUST minimize object allocations and avoid garbage collection spikes.
4. **Visibility-Aware Polling**: When the taskpane is hidden, minimized, or backgrounded (`visibilitychange`), all polling mechanisms MUST pause immediately to prevent CPU and battery drain.

---

## Article IV — Calm, Native-Adjacent UX Supremacy

1. **Worksheet Name Primacy**: Worksheet titles are the primary visual target. Controls, icons, badges, and metadata MUST remain secondary and unobtrusive.
2. **Zero Decorative Slop**: Avoid arbitrary cards, heavy drop shadows, promotional banners, and loud web-app styling. The UI must feel like a natural, calm extension of Microsoft Excel Fluent Design.
3. **Keyboard-First Ergonomics**: Every core action (navigation, search, activation, drag-and-drop, rename, hide/unhide) MUST be fully operable via keyboard shortcuts without requiring mouse interaction.
4. **Inline Interactions**: Prefer inline editors (`InlineRenameInput`, `InlineGroupCreator`) and lightweight confirmation dialogs (`ConfirmDialog`) over invasive full-screen modal takeovers.

---

## Article V — Security, Privacy & Compliance

1. **Zero Data Extraction**: Sheet Navigator is a navigation utility. It MUST NEVER read, store, or transmit cell contents, workbook formulas, or user data to external servers.
2. **Least Privilege**: Manifest permissions (`excel-navbar-plugin.xml`) MUST only request the minimum required API sets (`SharedRuntime 1.1`, `ExcelApi 1.1`).
3. **License Integrity**: All codebase assets, components, and documentation are governed by Creative Commons Attribution-NonCommercial 4.0 (`CC-BY-NC-4.0`). Commercial use requires explicit authorization.
4. **Secret Protection**: Committing credentials, API keys, tokens, or private URLs is strictly prevented by automated `check:secrets` pre-commit hooks.

---

## Article VI — Continuous Quality Gate Supremacy

1. **Zero Failing Gates**: No pull request or commit to `develop` or `main` is permitted unless all 10 automated quality gates pass:
   - TypeScript strict typecheck (`tsc --noEmit`)
   - ESLint (`eslint --max-warnings=0`)
   - Stylelint & Markdownlint (`lint:css`, `lint:md`)
   - Prettier formatting verification (`format:check`)
   - Vitest test suite with coverage (`test:coverage`)
   - Circular dependency audit (`check:import-cycles`)
   - Dead code & orphan dependency audit (`knip`)
   - Office.js API requirement set compliance (`check:office-api-requirements`)
   - Mock drift detection (`check:mock-drift`)
   - Production bundle size gate & manifest validation (`manifest:validate`)
2. **Testing Mandate**: Any new logic or modified behavior MUST include corresponding unit or integration tests under `tests/`.
