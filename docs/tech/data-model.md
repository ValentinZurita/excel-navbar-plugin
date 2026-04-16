# Data Model

- Worksheet identity uses a stable plugin sheet ID when the host supports worksheet custom properties, with native Excel worksheet IDs as fallback
- Group membership is single-group only
- Pinning and grouping are mutually exclusive
- Groups persist their own worksheet order
- The Sheets section persists its own local sidebar order after the initial workbook hydration
- Workbook reconciliation preserves local sidebar order, removes deleted worksheet IDs, and appends newly discovered worksheets using Excel workbook order
- Groups keep existing empty containers when external workbook edits remove all of their worksheets
- Persist only meaningful workbook UI state
- Persist a schema version and identity mode from day one
- Canonical persistence is a versioned workbook-scoped Custom XML payload; settings only carry metadata and compatibility fallback data
- Local backup uses a workbook-scoped cache key and is recovery-only, not a primary source of truth
- Workbooks without stable identity still avoid local-cache reads and writes until the file has a stable workbook key
