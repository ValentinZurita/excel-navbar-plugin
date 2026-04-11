# Data Model

- Worksheet identity uses stable Excel worksheet IDs
- Group membership is single-group only
- Pinning and grouping are mutually exclusive
- Groups persist their own worksheet order
- The Sheets section persists its own local sidebar order after the initial workbook hydration
- Workbook reconciliation preserves local sidebar order, removes deleted worksheet IDs, and appends newly discovered worksheets using Excel workbook order
- Persist only meaningful workbook UI state
- Persist a metadata version from day one
