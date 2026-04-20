# Platform Limitations

- Task pane is the primary surface
- Global shortcuts are not core MVP
- Sync is best effort with graceful refresh
- VeryHidden sheets are treated conservatively in MVP

## Navigator idle highlight

When the active worksheet exists only under **Hidden**, the idle visual anchor still resolves to `worksheet:{id}` so highlight and fade logic match the Hidden row, once that section is expanded. If Hidden is collapsed, no row mounts for that id until expand. See `docs/navigation/active-visual-anchor.md`.

## Drag-and-drop interaction constraints

- Excel task pane webviews can behave poorly with sticky pseudo-classes such as `:hover` and `:focus-within` during sortable drag interactions.
- Because of that host behavior, worksheet drag visuals must prefer explicit state over CSS-only interaction modeling.
- Visual polish changes in drag-and-drop are high-risk. Do not change hover, focus, overlay offset, collision detection, or source-row visibility without a focused regression check in the real task pane.
