---
title: CLI Draft Next Actions Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Draft Next Actions Refactor 2026-06-11

## Result

Moved draft preview/collect next-action calculation out of the oversized CLI entrypoint into `src/cli/draft-next-actions.ts`.

## Changed

- `src/cli/draft-next-actions.ts`
  - Owns `previewNextActions`, `collectJsonNextActions`, and `remotePreviewNextActions`.
  - Keeps uploaded draft guidance delegated to `uploadNextActions`.
- `src/cli/index.ts`
  - Imports the extracted next-action functions instead of defining them inline.
- `tests/cli-draft-next-actions.test.ts`
  - Adds focused unit coverage for pending, uploaded, and remote-validity guidance.
- `tests/cli-handoff-policy.test.ts`
  - Updates the source-contract slice boundary after the extraction.

## Verification

- Red check: `npx vitest run tests/cli-draft-next-actions.test.ts --reporter=verbose` failed first because `src/cli/draft-next-actions.js` did not exist.
- `npm run build` passed.
- `npx vitest run tests/cli-draft-next-actions.test.ts tests/cli-preview.test.ts tests/cli-collect.test.ts tests/cli-share.test.ts --reporter=verbose` passed: 4 files, 93 tests.
- `npx vitest run tests/cli-handoff-policy.test.ts tests/cli-draft-next-actions.test.ts --reporter=verbose` passed after updating the source-contract sentinel: 2 files, 6 tests.
- `npm test -- --run` passed: 43 files, 627 tests.
- `git diff --check` passed.
- LOC check:
  - `src/cli/draft-next-actions.ts`: 29 pure LOC.
  - `tests/cli-draft-next-actions.test.ts`: 52 pure LOC.
  - `tests/cli-handoff-policy.test.ts`: 37 pure LOC.
  - `src/cli/index.ts`: 3105 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because the TypeScript LSP server is not installed in this environment; `tsc` build is the typecheck evidence.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` by extracting another pure guidance cluster.
- Candidate: draft list/open/discard next-action helpers, as they still use the entrypoint-local `uniqueNextCommands`.
