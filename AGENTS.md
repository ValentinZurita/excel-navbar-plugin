# AGENTS.md

## Mission

Build and maintain an Excel worksheet navigator that feels calm, native-adjacent, and reliable inside Excel.

## Mandatory rules

- Never remove, untrack, or add to `.gitignore` the `.engram/` directory or its tracked files unless the human explicitly requests it. CI enforces this via `npm run check:engram-protected`.
- Ask the human when a meaningful product or technical doubt remains.
- Do not claim a feature works unless it was verified.
- Keep language simple when speaking to the human reviewer.
- Use descriptive English names in code and files.
- Keep files small and obvious.
- Avoid monolithic React components.
- Keep presentation components free of business logic.
- Put Office.js access in adapters/services, not in components.
- Treat UX quality and Excel alignment as core functionality, not later polish.

## Design non-negotiables

- Respect `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/design/visual-baseline.md` as the approved visual baseline.
- Extend the current design direction; do not reset it, dilute it, or introduce conflicting visual language.
- Keep worksheet names as the primary visual target. Controls and metadata must stay secondary.
- Prefer calm, native-adjacent Excel UI over generic web-app patterns.
- Avoid decorative cards, loud shadows, promotional headers, and persistent controls that compete with navigation.
- Prefer contextual actions and shared tokens/selectors over ad-hoc component styling.
- If a visual change increases noise or feels less Excel-aligned, stop and rethink it before implementation.

## Commit policy

- Prefer small conventional commits.
- One concern per commit.
- Explain what changed and why in plain language.
- Never batch unrelated work into one commit.

## AI-first working style

- Navigate by folders and clear boundaries.
- Leave purposeful comments when intent is not obvious.
- If behavior differs from docs, update the docs.
- If you are blocked, stop and ask.

- Read `/Users/valentin/Library/Mobile Documents/com~apple~CloudDocs/Documents/Plugin/docs/dev/commit-guide.md` before proposing or creating commits.
