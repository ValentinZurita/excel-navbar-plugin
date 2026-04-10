# Components Organization

Each component lives in its own folder.

## Structure

- `src/ui/components/<Component>/index.tsx`
- `src/ui/components/<Component>/<Component>.css` (optional)

## Why

- Keeps JSX and styles colocated.
- Reduces scattered flat files in the components root.
- Makes component ownership obvious during refactors.

## Import convention

- Import components by folder path, not by internal file path.
- Example: `import { Section } from '../../components/Section';`

## Rule of thumb

- If style is shared by multiple components, move it to `src/ui/styles/taskpaneUtilities.css`.
- If style is specific to one component, keep it inside that component folder.
