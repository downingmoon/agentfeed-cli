---
title: CLI Status Doctor Test Split 2026-06-22
aliases:
  - CLI status doctor test split
  - Status doctor split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: b7d5558c941194c39650b400e679bc0b65620c6d
---

# CLI Status Doctor Test Split 2026-06-22

## Summary

CLI near-ceiling `tests/cli-status-doctor.test.ts`에서 parseable doctor JSON diagnostics coverage를 `tests/cli-status-doctor-json.test.ts`로 분리하고, shared built CLI path/temp dir fixture/ANSI pattern/async exec helper를 `tests/cli-status-doctor-helpers.ts`로 통합했다.

> [!success]
> Behavior-preserving test split only. 신규 앱 기능, 서버/인프라/CI/CD 변경, push/deploy 없음.

## Code Commit

- `b7d5558c941194c39650b400e679bc0b65620c6d` — `Split CLI status doctor tests`

## Files

- `tests/cli-status-doctor.test.ts`
  - empty git repository status/doctor provenance
  - package version diagnostics
  - human doctor credential/API provenance and collection cursor output
- `tests/cli-status-doctor-json.test.ts`
  - parseable doctor JSON contract
  - no human headings, no ANSI escapes, no token leakage
  - readiness, priority actions, agent signal summary, next actions
- `tests/cli-status-doctor-helpers.ts`
  - built CLI path and build gate
  - temp project/home lifecycle
  - async exec helper and ANSI escape pattern

## Verification Evidence

- Baseline before split:
  - `npm test -- --run tests/cli-status-doctor.test.ts`
  - 1 file / 4 tests passed
- Targeted split:
  - `npm test -- --run tests/cli-status-doctor.test.ts tests/cli-status-doctor-json.test.ts`
  - 2 files / 4 tests passed
- Typecheck:
  - `npm run typecheck` passed
- Build:
  - `npm run build` passed
- Full CLI suite:
  - `npm test -- --run`
  - 220 files / 848 tests passed
- Whitespace:
  - `git diff --check` passed before commit
  - `git diff --staged --check` passed before commit
- Changed-file pure LOC audit:
  - `tests/cli-status-doctor.test.ts`: 110
  - `tests/cli-status-doctor-json.test.ts`: 86
  - `tests/cli-status-doctor-helpers.ts`: 26

## LSP Gap

LSP diagnostics were attempted for all three changed TypeScript files, but the LSP transport failed with `Transport closed`. Fallback evidence is `npm run typecheck`, `npm run build`, targeted Vitest, full Vitest, and diff checks.

## Remaining 200+ LOC Candidates

Next CLI test split candidates after this commit:

```text
202 tests/cli-rotate-browser-replacement.test.ts
201 tests/cli-collect-command-ux.test.ts
200 tests/release-preflight.test.ts
```

## Related

- [[Active Tasks]]
- [[CLI Cached Upload Reuse Residual Split 2026-06-22]]
- [[CLI Share Upload Execution Test Split 2026-06-22]]
