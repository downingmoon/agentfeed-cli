---
title: CLI Draft Validation Reconstruction Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/cli
  - enterprise-hardening
  - validation
status: done
---

# CLI Draft Validation Reconstruction Guard 2026-06-10

## Context

`src/draft/validation.ts` validated local draft JSON fields, but finished by returning the original parsed root with `root as unknown as LocalDraft`.

That meant validation proved required fields were shaped correctly, but unknown persisted fields from a hand-edited or corrupted `.agentfeed/drafts/*.json` file could still leak past the read boundary.

## Decision

Return a newly constructed `LocalDraft` from parsed fields instead of trusting the original JSON object.

- `validateLocalDraft` now reconstructs the top-level draft, `project`, `worklog`, `privacy_scan`, `source`, and `upload` objects.
- Unknown persisted keys are stripped after successful validation.
- Validation primitives moved to `src/draft/validation-primitives.ts` so each file stays below the 250 pure LOC ceiling.
- Generic enum casts were replaced with explicit enum-specific parsers such as `requireAgentType`, `requirePrivacyStatus`, and `requireCollectionQuality`.

## Regression coverage

Added `tests/draft-validation.test.ts`:

- Given a saved local draft JSON with unexpected root/project/worklog/source/upload fields
- When `readDraft` loads it through validation
- Then the returned `LocalDraft` does not expose those unknown fields

## Verification

- Red test was first confirmed failing before implementation because the old validator returned the original object.
- `npm run clean && npm run build` passed.
- `npm test -- --run` passed: 30 files / 595 tests.
- `npm run typecheck` passed.
- Escape-hatch scan found no `as unknown`, `as LocalDraft`, `any`, `@ts-ignore`, or `@ts-expect-error` in the changed validation files/test.
- Pure LOC:
  - `src/draft/validation.ts`: 197
  - `src/draft/validation-primitives.ts`: 195
  - `tests/draft-validation.test.ts`: 39

> [!warning] LSP gap
> `typescript-language-server` is not installed locally, so MCP LSP diagnostics could not run. `tsc --noEmit` was used as the authoritative TypeScript verification gate.

## Follow-up

- Continue splitting remaining oversized CLI files only when touched by a behavior-preserving work item.
- Keep future draft JSON boundary changes parse-and-reconstruct rather than validate-and-cast.
