---
title: CLI Share JSON Handoff Test Split 2026-06-22
aliases:
  - CLI share JSON handoff test split
  - Share JSON handoff split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 7cda0cb106b84ba6d96a53a7782b5dbb5a80ad19
---

# CLI Share JSON Handoff Test Split 2026-06-22

## Summary

CLI near-ceiling `tests/cli-share-json-handoff.test.ts`에서 requested review URL handoff failure JSON payload coverage를 `tests/cli-share-json-handoff-failure.test.ts`로 분리했다. Existing share JSON upload fixture and handoff helper behavior was reused unchanged.

> [!success]
> Behavior-preserving test split only. 신규 앱 기능, 서버/인프라/CI/CD 변경, push/deploy 없음.

## Code Commit

- `7cda0cb106b84ba6d96a53a7782b5dbb5a80ad19` — `Split CLI share JSON handoff tests`

## Files

- `tests/cli-share-json-handoff.test.ts`
  - default share JSON handoff side-effect suppression
  - explicitly requested copy/open side effects
- `tests/cli-share-json-handoff-failure.test.ts`
  - requested clipboard/browser handoff failure warnings inside JSON payload

## Verification Evidence

- Baseline before split:
  - `npm test -- --run tests/cli-share-json-handoff.test.ts`
  - 1 file / 3 tests passed
- Targeted split:
  - `npm test -- --run tests/cli-share-json-handoff.test.ts tests/cli-share-json-handoff-failure.test.ts`
  - 2 files / 3 tests passed
- Typecheck:
  - `npm run typecheck` passed
- Build:
  - `npm run build` passed
- Full CLI suite:
  - `npm test -- --run`
  - 213 files / 848 tests passed
- Whitespace:
  - `git diff --check` passed before commit
  - `git diff --staged --check` passed before commit
- Changed-file pure LOC audit:
  - `tests/cli-share-json-handoff.test.ts`: 144
  - `tests/cli-share-json-handoff-failure.test.ts`: 81

## LSP Gap

LSP diagnostics were attempted for both changed TypeScript files, but the LSP transport failed with `Transport closed`. Fallback evidence is `npm run typecheck`, `npm run build`, targeted Vitest, full Vitest, and diff checks.

## Remaining 200+ LOC Candidates

Next CLI test split candidates after this commit:

```text
210 tests/keychain-env.test.ts
205 tests/cli-collect-json-auth.test.ts
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
- [[CLI Generic Metadata Collector Test Split 2026-06-22]]
- [[CLI Git Draft Configured Commands Test Split 2026-06-22]]
