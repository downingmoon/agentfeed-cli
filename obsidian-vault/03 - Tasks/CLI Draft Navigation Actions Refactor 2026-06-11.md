---
title: CLI Draft Navigation Actions Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Draft Navigation Actions Refactor 2026-06-11

## Result

Extracted share dry-run, draft list, discard, and open follow-up command guidance from the oversized CLI entrypoint into `src/cli/draft-navigation-actions.ts`.

## Changed

- `src/cli/draft-navigation-actions.ts`
  - Owns `shareDryRunNextActions`, `draftListNextActions`, `discardConfirmationNextActions`, `discardCompleteNextActions`, and `openNextActions`.
  - Adds the narrow `DraftListActionRow` input type so the module does not depend on entrypoint internals.
- `src/cli/index.ts`
  - Imports these pure next-action helpers and keeps command orchestration/printing in the entrypoint.
- `tests/cli-draft-navigation-actions.test.ts`
  - Adds focused unit coverage for credential-aware share guidance, list empty/invalid/pending/uploaded states, discard guidance, and open fallback guidance.

## Verification

- Red check: `npx vitest run tests/cli-draft-navigation-actions.test.ts --reporter=verbose` failed first because `src/cli/draft-navigation-actions.js` did not exist.
- `npm run build` passed.
- `npx vitest run tests/cli-draft-navigation-actions.test.ts tests/cli-drafts.test.ts tests/cli-share.test.ts --reporter=verbose` passed: 3 files, 74 tests.
- `npm test -- --run` passed: 44 files, 630 tests.
- `git diff --check` passed.
- Escape-hatch grep passed for changed TS files: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, enum, or non-null assertion.
- LOC check:
  - `src/cli/draft-navigation-actions.ts`: 45 pure LOC.
  - `tests/cli-draft-navigation-actions.test.ts`: 44 pure LOC.
  - `src/cli/index.ts`: 3074 pure LOC, inherited oversized defect; reduced by this slice.
- LSP diagnostics not run because the TypeScript LSP server is not installed; `tsc` build is the typecheck evidence.

## Remaining Follow-up

- Continue shrinking `src/cli/index.ts` by extracting another cohesive pure cluster.
- Candidate: privacy scan/init next-action helpers, since they are still local to `index.ts` and covered by existing CLI tests.
