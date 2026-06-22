---
title: CLI Share Helper Test Split 2026-06-22
aliases:
  - CLI share helper test split
  - Share args privacy policy split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 02ced30
---

# CLI Share Helper Test Split 2026-06-22

## Summary

CLI share helper coverage를 책임별로 분리했다.

- `tests/share.test.ts`: share preview rendering, wrapping, terminal sanitization, collection evidence, metrics formatting coverage만 유지.
- `tests/share-args.test.ts`: share-specific argument parsing, missing option values, unsupported source recovery coverage 분리.
- `tests/share-privacy-policy.test.ts`: private review upload/public publish privacy policy messaging and blocker coverage 분리.

## Changed Files

- `tests/share.test.ts`
- `tests/share-args.test.ts`
- `tests/share-privacy-policy.test.ts`

## Verification Evidence

- Baseline before split: `npm test -- --run tests/share.test.ts` → 1 file / 14 tests passed.
- Targeted split: `npm test -- --run tests/share.test.ts tests/share-args.test.ts tests/share-privacy-policy.test.ts` → 3 files / 14 tests passed.
- Typecheck: `npm run typecheck` passed.
- Build: `npm run build` passed.
- Full CLI suite: `npm test -- --run` → 202 files / 848 tests passed.
- Diff hygiene: `git diff --check` clean.
- No-excuse changed-file scan clean: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion scan hit, or empty catch output.
- Changed-file pure LOC audit:
  - `tests/share.test.ts`: 156
  - `tests/share-args.test.ts`: 34
  - `tests/share-privacy-policy.test.ts`: 53
- LSP diagnostics gap: changed files all failed with `Transport closed`; `npm run typecheck` used as fallback evidence.

## Scope

- No new app features.
- No CLI-Frontend-Backend contract change.
- No server, infra, or CI/CD change.
- No push/deploy due to server deploy prohibition.

## Code Commit

- `02ced30 Split CLI share helper tests`

## Remaining Next Candidates

Current oversized/near-ceiling candidates after this split:

```text
230 tests/cli-scan.test.ts
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
```
