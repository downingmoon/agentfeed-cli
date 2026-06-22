---
title: CLI Browser Login Flow Residual Test Split 2026-06-22
aliases:
  - CLI browser login flow residual test split
  - Browser login flow residual split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 7c34331
---

# CLI Browser Login Flow Residual Test Split 2026-06-22

## Summary

남아 있던 CLI browser login flow near-ceiling suite를 책임별로 추가 분리했다.

- `tests/cli-browser-login-flow.test.ts`: no-open browser login session exchange and credential save happy-path coverage만 유지.
- `tests/cli-browser-login-exchange-validation.test.ts`: malformed browser exchange response rejection and existing credential preservation coverage 분리.
- `tests/cli-browser-login-ci-env.test.ts`: CI environment fail-fast guard coverage 분리.
- `tests/cli-browser-login-flow-helpers.ts`: temp project/home lifecycle, env restore, metadata/session/ingestion fake responses, request body parser 공유.

## Changed Files

- `tests/cli-browser-login-flow.test.ts`
- `tests/cli-browser-login-exchange-validation.test.ts`
- `tests/cli-browser-login-ci-env.test.ts`
- `tests/cli-browser-login-flow-helpers.ts`

## Verification Evidence

- Baseline before split: `npm test -- --run tests/cli-browser-login-flow.test.ts` → 1 file / 19 tests passed.
- Targeted split: `npm test -- --run tests/cli-browser-login-flow.test.ts tests/cli-browser-login-exchange-validation.test.ts tests/cli-browser-login-ci-env.test.ts` → 3 files / 19 tests passed.
- Typecheck: `npm run typecheck` passed.
- Build: `npm run build` passed.
- Full CLI suite: `npm test -- --run` → 206 files / 848 tests passed.
- Diff hygiene: `git diff --check` and `git diff --staged --check` clean.
- No-excuse changed-file scan clean: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion scan hit, or empty catch output.
- Changed-file pure LOC audit:
  - `tests/cli-browser-login-flow.test.ts`: 75
  - `tests/cli-browser-login-exchange-validation.test.ts`: 44
  - `tests/cli-browser-login-ci-env.test.ts`: 31
  - `tests/cli-browser-login-flow-helpers.ts`: 100
- LSP diagnostics gap: changed files all failed with `Transport closed`; `npm run typecheck` used as fallback evidence.

## Scope

- No new app features.
- No CLI-Frontend-Backend contract change.
- No server, infra, or CI/CD change.
- No push/deploy due to server deploy prohibition.

## Code Commit

- `7c34331 Split CLI browser login flow tests`

## Relation To Previous Notes

- Preserves the earlier [[CLI Browser Login Flow Test Split 2026-06-22]] note for the prior `api-hook` browser-login extraction work.
- This note documents the residual near-ceiling split of the already extracted `tests/cli-browser-login-flow.test.ts` suite.

## Remaining Next Candidates

Current oversized/near-ceiling candidates after this split:

```text
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
201 tests/cli-collect-command-ux.test.ts
```
