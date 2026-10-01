# Microsoft Marketplace visual remediation

## Objective

Address Microsoft's certification request for clearer feature imagery without changing the product's
commercial model or uploading/resubmitting the offer before human approval.

## Problem

The offer previously had one static Excel screenshot, while each feature was primarily demonstrated
by an animated GIF on the landing page. Microsoft requested more images that clearly showcase the
offer's features.

## Constraints

- Keep the existing GIFs and light/dark landing experience unchanged.
- Use static PNG evidence for Marketplace screenshots; target 1366 × 768 px with captions.
- Do not mark additional purchases, subscriptions, Azure AD, or add-in sign-in as required.
- Do not upload or resubmit anything in Partner Center in this work unit.
- Do not include personal or sensitive workbook data.
- Do not run a build.

## Tasks

- [x] Create static PNG candidates from the existing feature GIFs for Search, Groups, Preview, and
      Drag & Drop.
- [x] Normalize all Marketplace screenshot candidates to 1366 × 768 px and verify readability.
- [x] Update screenshot plan and submission checklist with the final candidate files and captions.
- [x] Clarify in listing/certification notes that the add-in has no separate purchase, subscription,
      account, or sign-in flow; Microsoft/Excel account requirements belong to the host installation
      flow.
- [x] Run applicable asset/documentation validation, review the diff, and create one work-unit
      commit.

## Acceptance criteria

- Five static PNG candidates exist: Overview, Search, Groups, Preview, and Drag & Drop.
- Every candidate is exactly 1366 × 768 px, legible, and contains no private data.
- The landing GIFs remain unchanged.
- Documentation names the assets and preserves the No additional purchases decision.
- Validation results and commit identity are recorded below.

## Route

- Implementation: delegated direct writer for multi-file asset/documentation work.
- Verification: focused asset/documentation checks and diff review.

## Progress

- Started: 2026-10-01
- Completed: 2026-10-01
- Current task: complete; static screenshot candidates and submission documentation are ready for
  human review.
- Verification evidence:
  - Focused PNG validation confirmed all five required files are valid PNGs at 1366 × 768 px.
  - `git diff --check` passed.
  - `pnpm validate` passed: typecheck, lint, and 40 test files / 461 tests.
  - `pnpm quality` initially reported only Prettier formatting in
    `docs/appsource/screenshot-plan.md`; after normalization, the rerun passed all quality checks.
  - No build command was run.
- Commit: `HEAD` — `docs(docs): align marketplace screenshots with live dimensions`; follow-up includes the five normalized PNGs and documentation correction.

## Next step

A human publisher should review the five static PNG candidates and complete any Partner Center
upload or resubmission separately.
