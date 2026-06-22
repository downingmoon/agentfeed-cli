---
title: CLI Cached Upload Reuse Residual Split 2026-06-22
aliases:
  - CLI cached upload reuse residual split
  - Cached upload reuse residual split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 45efa1754e0e36285fadca8197ecafc2d0207588
---

# CLI Cached Upload Reuse Residual Split 2026-06-22

## Summary

CLI near-ceiling `tests/cli-cached-upload-reuse-contract.test.ts`에서 stale payload/review URL fail-closed safety coverage를 `tests/cli-cached-upload-reuse-safety.test.ts`로 분리하고, shared temp project/home fixture, upload binding, saved draft readers를 `tests/cli-cached-upload-reuse-helpers.ts`로 통합했다.

> [!success]
> Behavior-preserving test split only. 신규 앱 기능, 서버/인프라/CI/CD 변경, push/deploy 없음.

## Code Commit

- `45efa1754e0e36285fadca8197ecafc2d0207588` — `Split cached upload reuse tests`

## Files

- `tests/cli-cached-upload-reuse-contract.test.ts`
  - already-uploaded draft reuse without upload
  - credential binding mismatch upload path
  - reusable status reason matrix
  - unchanged redacted draft second-upload reuse
- `tests/cli-cached-upload-reuse-safety.test.ts`
  - stale cached payload fail-closed guard
  - unsafe cached review URL rejection guard
- `tests/cli-cached-upload-reuse-helpers.ts`
  - temp project/home fixture lifecycle
  - upload binding helper
  - saved draft JSON reader and upload field helpers

## Verification Evidence

- Baseline before split:
  - `npm test -- --run tests/cli-cached-upload-reuse-contract.test.ts`
  - 1 file / 8 tests passed
- Targeted split:
  - `npm test -- --run tests/cli-cached-upload-reuse-contract.test.ts tests/cli-cached-upload-reuse-safety.test.ts`
  - 2 files / 8 tests passed
- Typecheck:
  - `npm run typecheck` passed
- Build:
  - `npm run build` passed
- Full CLI suite:
  - `npm test -- --run`
  - 219 files / 848 tests passed
- Whitespace:
  - `git diff --check` passed before commit
  - `git diff --staged --check` passed before commit
- Changed-file pure LOC audit:
  - `tests/cli-cached-upload-reuse-contract.test.ts`: 128
  - `tests/cli-cached-upload-reuse-safety.test.ts`: 63
  - `tests/cli-cached-upload-reuse-helpers.ts`: 60

## LSP Gap

LSP diagnostics were attempted for all three changed TypeScript files, but the LSP transport failed with `Transport closed`. Fallback evidence is `npm run typecheck`, `npm run build`, targeted Vitest, full Vitest, and diff checks.

## Remaining 200+ LOC Candidates

Next CLI test split candidates after this commit:

```text
202 tests/cli-status-doctor.test.ts
202 tests/cli-rotate-browser-replacement.test.ts
201 tests/cli-collect-command-ux.test.ts
200 tests/release-preflight.test.ts
```

## Related

- [[Active Tasks]]
- [[CLI Cached Upload Reuse Test Split 2026-06-22]]
- [[CLI Share Upload Execution Test Split 2026-06-22]]
