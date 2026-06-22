---
title: CLI Share Guidance Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI share guidance test split
  - CLI share guidance test split
---

# CLI Share Guidance Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 share/publish guidance 및 dry-run output 계약을 별도 suites로 분리했다. CLI runtime 동작 변경 없이 기존 54개 share CLI cases를 유지했고, full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `a2aa9d6 Split CLI share guidance tests`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-share-guidance.test.ts`
  - `tests/cli-share-dry-run-output.test.ts`
  - `tests/cli-share-guidance-helpers.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / reviewability hardening

## Background

`tests/cli-share.test.ts`는 2494 pure LOC로 CLI test suite에서 가장 큰 파일이었다. 한 파일 안에 guidance/recovery, dry-run human/JSON output, upload preflight, review URL handoff, cached publish reuse, locking까지 섞여 있어 reviewability가 낮았다.

## Changes

- `tests/cli-share-guidance-helpers.ts`를 추가해 share guidance/dry-run suites의 temp repo/home setup과 CLI execution harness를 공유한다.
- `tests/cli-share-guidance.test.ts`를 추가해 project-init guidance, missing draft guidance, malformed config recovery, token-missing upload guidance 계약을 분리했다.
- `tests/cli-share-dry-run-output.test.ts`를 추가해 human dry-run, `--explain`, credential-aware guidance, JSON dry-run/upload-skipped output 계약을 분리했다.
- `tests/cli-share.test.ts`에서는 해당 10개 cases를 제거하고 upload/review/cached publish/locking cases만 유지했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/cli-share.test.ts: 54 passed
Initial split targeted: npm test -- --run tests/cli-share-guidance.test.ts tests/cli-share.test.ts: 54 passed
Final split targeted: npm test -- --run tests/cli-share-guidance.test.ts tests/cli-share-dry-run-output.test.ts tests/cli-share.test.ts: 54 passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 118 files / 848 tests passed
Git whitespace: git diff --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 2271 pure LOC
tests/cli-share-guidance.test.ts: 88 pure LOC
tests/cli-share-dry-run-output.test.ts: 122 pure LOC
tests/cli-share-guidance-helpers.ts: 67 pure LOC
```

## Follow-up

> [!todo]
> `tests/cli-share.test.ts` remains oversized at 2271 pure LOC. Continue splitting by cohesive behavior groups: upload preflight failures, review URL handoff/open trust policy, JSON upload side effects, cached publish reuse, and publish locking. Keep each split behavior-preserving with targeted `cli-share` verification plus full CLI suite before commit.
