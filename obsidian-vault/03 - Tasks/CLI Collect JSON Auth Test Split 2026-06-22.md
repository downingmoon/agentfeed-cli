---
title: CLI Collect JSON Auth Test Split 2026-06-22
aliases:
  - CLI collect JSON auth test split
  - Collect JSON auth split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 09a0db86ac2db7006ecbcf483ce1c50bc0f2db3c
---

# CLI Collect JSON Auth Test Split 2026-06-22

## Summary

CLI near-ceiling `tests/cli-collect-json-auth.test.ts`에서 API metadata compatibility refusal coverage를 `tests/cli-collect-json-compatibility.test.ts`로 분리하고, collect JSON fixture/failure runner/JSON output parsers/draft-count guard를 기존 `tests/cli-collect-json-upload-helpers.ts`에 통합했다.

> [!success]
> Behavior-preserving test split only. 신규 앱 기능, 서버/인프라/CI/CD 변경, push/deploy 없음.

## Code Commit

- `09a0db86ac2db7006ecbcf483ce1c50bc0f2db3c` — `Split CLI collect JSON auth tests`

## Files

- `tests/cli-collect-json-auth.test.ts`
  - parseable collect JSON output guard
  - JSON upload missing-token login guidance
  - human upload missing-token login guidance
- `tests/cli-collect-json-compatibility.test.ts`
  - incompatible API metadata refusal before token status check or ingest upload
  - invalid token redaction from JSON error output
- `tests/cli-collect-json-upload-helpers.ts`
  - shared collect fixture success/failure runners
  - shared collect JSON success/error output parsers
  - shared draft JSON count helper
  - existing upload helper exports preserved

## Verification Evidence

- Baseline before split:
  - `npm test -- --run tests/cli-collect-json-auth.test.ts`
  - 1 file / 4 tests passed
- Targeted split:
  - `npm test -- --run tests/cli-collect-json-auth.test.ts tests/cli-collect-json-compatibility.test.ts tests/cli-collect-json-upload-output.test.ts tests/cli-collect-json-upload-redaction.test.ts`
  - 2 files / 4 tests passed
- Related helper coverage:
  - `npm test -- --run tests/cli-collect.test.ts tests/cli-collect-json-auth.test.ts tests/cli-collect-json-compatibility.test.ts tests/cli-collect-upload-failures.test.ts tests/cli-collect-upload-cursor-failures.test.ts`
  - 5 files / 9 tests passed
- Typecheck:
  - `npm run typecheck` passed
- Build:
  - `npm run build` passed
- Full CLI suite:
  - `npm test -- --run`
  - 215 files / 848 tests passed
- Whitespace:
  - `git diff --check` passed before commit
  - `git diff --staged --check` passed before commit
- Changed-file pure LOC audit:
  - `tests/cli-collect-json-auth.test.ts`: 60
  - `tests/cli-collect-json-compatibility.test.ts`: 62
  - `tests/cli-collect-json-upload-helpers.ts`: 154

## LSP Gap

LSP diagnostics were attempted for all three changed TypeScript files, but the LSP transport failed with `Transport closed`. Fallback evidence is `npm run typecheck`, `npm run build`, targeted Vitest, related Vitest, full Vitest, and diff checks.

## Remaining 200+ LOC Candidates

Next CLI test split candidates after this commit:

```text
204 tests/cli-upload-confirmation.test.ts
204 tests/cli-api-health-checks.test.ts
203 tests/share-upload-execution.test.ts
203 tests/cli-cached-upload-reuse-contract.test.ts
202 tests/cli-status-doctor.test.ts
202 tests/cli-rotate-browser-replacement.test.ts
201 tests/cli-collect-command-ux.test.ts
200 tests/release-preflight.test.ts
```

## Related

- [[Active Tasks]]
- [[CLI Collect JSON Auth Policy Test Split 2026-06-22]]
- [[CLI Collect JSON Upload Helper Split 2026-06-22]]
