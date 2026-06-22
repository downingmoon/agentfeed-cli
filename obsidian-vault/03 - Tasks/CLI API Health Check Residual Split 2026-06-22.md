---
title: CLI API Health Check Residual Split 2026-06-22
aliases:
  - CLI API health check residual split
  - API health check residual split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 6c54bd76d469efcf1a12676e2c3aeac038d52049
---

# CLI API Health Check Residual Split 2026-06-22

## Summary

CLI near-ceiling `tests/cli-api-health-checks.test.ts`에서 ingestion token status/lifecycle/error contract coverage를 `tests/cli-api-ingestion-status.test.ts`로 분리하고, shared API health check env/global fetch cleanup을 `tests/cli-api-health-checks-helpers.ts`로 통합했다.

> [!success]
> Behavior-preserving test split only. 신규 앱 기능, 서버/인프라/CI/CD 변경, push/deploy 없음.

## Code Commit

- `6c54bd76d469efcf1a12676e2c3aeac038d52049` — `Split CLI API health check tests`

## Files

- `tests/cli-api-health-checks.test.ts`
  - API metadata compatibility contract coverage
  - malformed metadata envelope coverage
  - insecure public IPv4 override guard
  - backend readiness reachability coverage
- `tests/cli-api-ingestion-status.test.ts`
  - ingestion token validity check coverage
  - lifecycle metadata parsing coverage
  - malformed ingestion status envelope/contract coverage
  - invalid ingestion token and malformed error envelope coverage
- `tests/cli-api-health-checks-helpers.ts`
  - `AGENTFEED_ALLOW_INSECURE_API` restoration
  - Vitest global fetch unstub cleanup

## Verification Evidence

- Baseline before split:
  - `npm test -- --run tests/cli-api-health-checks.test.ts`
  - 1 file / 26 tests passed
- Targeted split:
  - `npm test -- --run tests/cli-api-health-checks.test.ts tests/cli-api-ingestion-status.test.ts`
  - 2 files / 26 tests passed
- Typecheck:
  - `npm run typecheck` passed
- Build:
  - `npm run build` passed
- Full CLI suite:
  - `npm test -- --run`
  - 217 files / 848 tests passed
- Whitespace:
  - `git diff --check` passed before commit
  - `git diff --staged --check` passed before commit
- Changed-file pure LOC audit:
  - `tests/cli-api-health-checks.test.ts`: 97
  - `tests/cli-api-ingestion-status.test.ts`: 110
  - `tests/cli-api-health-checks-helpers.ts`: 9

## LSP Gap

LSP diagnostics were attempted for all three changed TypeScript files, but the LSP transport failed with `Transport closed`. Fallback evidence is `npm run typecheck`, `npm run build`, targeted Vitest, full Vitest, and diff checks.

## Remaining 200+ LOC Candidates

Next CLI test split candidates after this commit:

```text
203 tests/share-upload-execution.test.ts
203 tests/cli-cached-upload-reuse-contract.test.ts
202 tests/cli-status-doctor.test.ts
202 tests/cli-rotate-browser-replacement.test.ts
201 tests/cli-collect-command-ux.test.ts
200 tests/release-preflight.test.ts
```

## Related

- [[Active Tasks]]
- [[CLI API Health Check Test Split 2026-06-22]]
- [[CLI Upload Confirmation Residual Split 2026-06-22]]
