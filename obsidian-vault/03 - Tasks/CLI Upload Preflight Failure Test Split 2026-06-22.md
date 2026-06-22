---
title: CLI Upload Preflight Failure Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI upload preflight failure test split
  - CLI upload preflight failure test split
---

# CLI Upload Preflight Failure Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 upload preflight failure 계약을 share/publish 전용 suite와 shared helper로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `8006084 Split CLI upload preflight failure tests`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-upload-preflight-failure-helpers.ts`
  - `tests/cli-share-upload-preflight-failure.test.ts`
  - `tests/cli-publish-upload-preflight-failure.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / upload preflight failure isolation

## Background

`tests/cli-share.test.ts`는 publish cache split 이후에도 1696 pure LOC였고, share upload preflight failure와 direct publish upload preflight failure contracts가 share upload/output, publish JSON handoff, locking, human handoff warning coverage와 섞여 있었다. 실패 경계 테스트를 먼저 분리해 review 단위를 줄이고 remaining split 후보를 더 명확하게 만들었다.

## Changes

- `tests/cli-upload-preflight-failure-helpers.ts`를 추가해 isolated CLI environment, temporary repo/home setup, failing CLI execution, upload-preflight failure server, metadata/error-output assertions를 공유한다.
- `tests/cli-share-upload-preflight-failure.test.ts`를 추가해 `agentfeed share` upload preflight failure cases를 분리했다.
- `tests/cli-publish-upload-preflight-failure.test.ts`를 추가해 direct `agentfeed publish` upload preflight failure cases를 분리했다.
- `tests/cli-share.test.ts`에서 해당 failure cases와 더 이상 사용하지 않는 `isolatedCliEnv()` / `runCliFailure()` helper block을 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Targeted split: npm test -- --run tests/cli-share-upload-preflight-failure.test.ts tests/cli-publish-upload-preflight-failure.test.ts tests/cli-share.test.ts: 3 files / 25 tests passed
Post-helper-removal targeted: npm test -- --run tests/cli-share-upload-preflight-failure.test.ts tests/cli-publish-upload-preflight-failure.test.ts tests/cli-share.test.ts: 3 files / 25 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 123 files / 848 tests passed
Git whitespace: git diff --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 1404 pure LOC
tests/cli-upload-preflight-failure-helpers.ts: 130 pure LOC
tests/cli-share-upload-preflight-failure.test.ts: 108 pure LOC
tests/cli-publish-upload-preflight-failure.test.ts: 117 pure LOC
```

## Follow-up

> [!todo]
> `tests/cli-share.test.ts` remains oversized at 1404 pure LOC. Continue behavior-preserving splits by cohesive groups: share JSON upload/output side effects, publish JSON handoff, publish locking, human handoff warnings, and possibly human upload completion/confirmation gates. Keep targeted verification plus full CLI suite before each commit.
