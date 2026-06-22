---
title: CLI Collect JSON Upload Helper Split 2026-06-22
aliases:
  - CLI collect JSON upload helper split
  - Collect JSON upload fixture split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: b3e39af
---

# CLI Collect JSON Upload Helper Split 2026-06-22

## Summary

CLI `collect --json --upload` test harness를 책임별로 분리했다.

- `tests/cli-collect.test.ts`: observable collect JSON upload behavior assertions만 유지.
- `tests/cli-collect-json-upload-helpers.ts`: temp git repo, AgentFeed init fixture, CLI 실행 wrapper, local upload server lifecycle, request body parsing, failing browser opener fixture를 분리.
- 기존 upload preflight fixture는 `tests/cli-collect-upload-failure-helpers.ts`의 `handleUploadPreflight`를 재사용해 metadata/token status mock 중복을 줄였다.

## Changed Files

- `tests/cli-collect.test.ts`
- `tests/cli-collect-json-upload-helpers.ts`

## Verification Evidence

- Baseline before split: `npm test -- --run tests/cli-collect.test.ts` → 1 file / 2 tests passed.
- Post-split target: `npm test -- --run tests/cli-collect.test.ts` → 1 file / 2 tests passed.
- Related targeted run: `npm test -- --run tests/cli-collect.test.ts tests/cli-collect-upload-failures.test.ts` → 2 files / 5 tests passed.
- Typecheck: `npm run typecheck` passed.
- Build: `npm run build` passed.
- Full CLI suite: `npm test -- --run` → 200 files / 848 tests passed.
- Diff hygiene: `git diff --check` clean.
- No-excuse changed-file scan clean: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion scan hit, or empty catch output.
- Changed-file pure LOC audit:
  - `tests/cli-collect.test.ts`: 138
  - `tests/cli-collect-json-upload-helpers.ts`: 91
- LSP diagnostics gap: changed files all failed with `Transport closed`; `npm run typecheck` used as fallback evidence.

## Scope

- No new app features.
- No CLI-Frontend-Backend contract change.
- No server, infra, or CI/CD change.
- No push/deploy due to server deploy prohibition.

## Code Commit

- `b3e39af Split CLI collect JSON upload helpers`

## Remaining Next Candidates

Current oversized/near-ceiling candidates after this split:

```text
236 tests/cli-publish-review-handoff.test.ts
234 tests/share.test.ts
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
```
