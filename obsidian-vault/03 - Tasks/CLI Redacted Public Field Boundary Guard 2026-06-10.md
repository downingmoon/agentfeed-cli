---
title: CLI Redacted Public Field Boundary Guard
date: 2026-06-10
tags:
  - agentfeed/cli
  - task/security
  - task/contract
status: done
---

# CLI Redacted Public Field Boundary Guard

## Context

AgentFeed CLI sanitizes public upload fields before `scan`, `publish`, and upload flows. The previous `applyRedactedPublicFields` path copied nested redaction output back into a draft with broad TypeScript assertions for `metrics`, `timeline`, `outcome`, `changed_areas`, `tags`, and `project`.

That made malformed redaction output hard to diagnose: bad nested shapes could be silently trusted or partially applied before a later failure.

## 변경 사항

- Added `src/privacy/redacted-public-fields.ts` as a strict parser for redacted public fields.
- Kept `src/privacy/draft-sanitizer.ts` focused on orchestration and draft mutation.
- Changed redaction application to parse a complete patch first, then mutate the draft only after parsing succeeds.
- Added an explicit regression test that malformed `outcome` redaction data throws:
  - `Invalid redacted public field outcome: expected an array of strings.`
- Removed the sanitizer-local `structuredClone(draft) as LocalDraft` assertion.

## Verification

- `npm test -- --run tests/privacy.test.ts` → 48 passed.
- `npm test -- --run tests/privacy.test.ts tests/cli-scan.test.ts` → 55 passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `npm test -- --run` → 28 files, 592 tests passed.
- Changed-file LOC check:
  - `src/privacy/draft-sanitizer.ts` → 55 pure LOC.
  - `src/privacy/redacted-public-fields.ts` → 236 pure LOC.
  - `tests/privacy.test.ts` → 163 pure LOC.
- LSP diagnostics could not run because `typescript-language-server` is not installed locally. `tsc --noEmit` was used as the authoritative type evidence.

## Follow-up

> [!todo]
> `src/draft/create.ts` still has broad assertions around initial redacted draft construction. It is larger and should be handled in a separate TDD pass with a small parser/helper extraction rather than mixed into this boundary change.

> [!todo]
> `src/api/client.ts` and `src/cli/index.ts` remain oversized pre-existing files. Split only when touching a cohesive area, with regression tests first.
