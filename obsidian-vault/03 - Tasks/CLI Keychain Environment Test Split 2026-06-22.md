---
title: CLI Keychain Environment Test Split 2026-06-22
aliases:
  - CLI keychain environment test split
  - Keychain env split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: f0ed8c01a541df8adf0148b66308a0d7ee6a8ede
---

# CLI Keychain Environment Test Split 2026-06-22

## Summary

CLI near-ceiling `tests/keychain-env.test.ts`에서 Windows DPAPI native storage/plaintext leakage coverage를 `tests/keychain-env-windows.test.ts`로 분리하고, native keychain command mocks/env isolation/sensitive env scrub assertions를 `tests/keychain-env-helpers.ts`로 통합했다.

> [!success]
> Behavior-preserving test split only. 신규 앱 기능, 서버/인프라/CI/CD 변경, push/deploy 없음.

## Code Commit

- `f0ed8c01a541df8adf0148b66308a0d7ee6a8ede` — `Split CLI keychain environment tests`

## Files

- `tests/keychain-env.test.ts`
  - macOS `security` password argument behavior
  - Linux `secret-tool` helper environment scrubbing behavior
- `tests/keychain-env-windows.test.ts`
  - Windows DPAPI native storage save/load/delete behavior
  - encrypted `.dpapi` sidecar plaintext leakage guard
  - PowerShell command/env secret scrubbing guard
- `tests/keychain-env-helpers.ts`
  - shared child process/platform mocks
  - shared temp home/env restoration fixture
  - shared sensitive env setup and scrub assertions
  - shared credential API imports

## Verification Evidence

- Baseline before split:
  - `npm test -- --run tests/keychain-env.test.ts`
  - 1 file / 3 tests passed
- Targeted split:
  - `npm test -- --run tests/keychain-env.test.ts tests/keychain-env-windows.test.ts`
  - 2 files / 3 tests passed
- Typecheck:
  - `npm run typecheck` passed
- Build:
  - `npm run build` passed
- Full CLI suite:
  - `npm test -- --run`
  - 214 files / 848 tests passed
- Whitespace:
  - `git diff --check` passed before commit
  - `git diff --staged --check` passed before commit
- Changed-file pure LOC audit:
  - `tests/keychain-env.test.ts`: 63
  - `tests/keychain-env-windows.test.ts`: 62
  - `tests/keychain-env-helpers.ts`: 120

## LSP Gap

LSP diagnostics were attempted for all three changed TypeScript files, but the LSP transport failed with `Transport closed`. Fallback evidence is `npm run typecheck`, `npm run build`, targeted Vitest, full Vitest, and diff checks.

## Remaining 200+ LOC Candidates

Next CLI test split candidates after this commit:

```text
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
- [[CLI Share JSON Handoff Test Split 2026-06-22]]
- [[CLI Keychain Storage Test Split 2026-06-22]]
