---
title: CLI Scan Test Split 2026-06-22
aliases:
  - CLI scan test split
  - Scan CLI output split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 3a0b8b0
---

# CLI Scan Test Split 2026-06-22

## Summary

CLI scan command coverage를 책임별로 분리했다.

- `tests/cli-scan.test.ts`: draft human output, dry-run mutation safety, redaction persistence, safe-result copy coverage만 유지.
- `tests/cli-scan-json.test.ts`: draft JSON output and path JSON output contract coverage 분리.
- `tests/cli-scan-path.test.ts`: path human output and no-draft-modification guidance coverage 분리.
- `tests/cli-scan-helpers.ts`: built CLI path, temp project/home lifecycle, scan command runner, draft path helper 공유.

## Changed Files

- `tests/cli-scan.test.ts`
- `tests/cli-scan-json.test.ts`
- `tests/cli-scan-path.test.ts`
- `tests/cli-scan-helpers.ts`

## Verification Evidence

- Baseline before split: `npm test -- --run tests/cli-scan.test.ts` → 1 file / 7 tests passed.
- Targeted split: `npm test -- --run tests/cli-scan.test.ts tests/cli-scan-json.test.ts tests/cli-scan-path.test.ts` → 3 files / 7 tests passed.
- Typecheck: `npm run typecheck` passed.
- Build: `npm run build` passed.
- Full CLI suite: `npm test -- --run` → 204 files / 848 tests passed.
- Diff hygiene: `git diff --check` clean.
- No-excuse changed-file scan clean: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion scan hit, or empty catch output.
- Changed-file pure LOC audit:
  - `tests/cli-scan.test.ts`: 78
  - `tests/cli-scan-json.test.ts`: 85
  - `tests/cli-scan-path.test.ts`: 18
  - `tests/cli-scan-helpers.ts`: 45
- LSP diagnostics gap: changed files all failed with `Transport closed`; `npm run typecheck` used as fallback evidence.

## Scope

- No new app features.
- No CLI-Frontend-Backend contract change.
- No server, infra, or CI/CD change.
- No push/deploy due to server deploy prohibition.

## Code Commit

- `3a0b8b0 Split CLI scan tests`

## Remaining Next Candidates

Current oversized/near-ceiling candidates after this split:

```text
227 tests/cli-browser-login-flow.test.ts
223 tests/cli-collect-upload-failures.test.ts
222 tests/cli-collect-config-state.test.ts
221 tests/config-keychain-storage.test.ts
214 tests/git-draft-configured-commands.test.ts
212 tests/session-collector-generic-metadata.test.ts
211 tests/cli-share-json-handoff.test.ts
210 tests/keychain-env.test.ts
205 tests/cli-collect-json-auth.test.ts
204 tests/cli-upload-confirmation.test.ts
204 tests/cli-api-health-checks.test.ts
203 tests/share-upload-execution.test.ts
203 tests/cli-cached-upload-reuse-contract.test.ts
202 tests/cli-status-doctor.test.ts
202 tests/cli-rotate-browser-replacement.test.ts
```
