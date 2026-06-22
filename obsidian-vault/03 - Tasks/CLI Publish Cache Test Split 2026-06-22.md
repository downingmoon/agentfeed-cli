---
title: CLI Publish Cache Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI publish cache test split
  - CLI publish cache test split
---

# CLI Publish Cache Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 direct `agentfeed publish` cached-upload reuse, preflight validation, token-status validation, and privacy-policy output 계약을 별도 suite로 분리했다. CLI runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `f81f551 Split CLI publish cache tests`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-publish-cache-helpers.ts`
  - `tests/cli-publish-cache.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / cached publish reuse contract isolation

## Background

`tests/cli-share.test.ts`는 직전 open-review URL split 이후에도 1927 pure LOC였다. 그 안에 direct publish cached upload reuse와 API/token preflight, privacy-policy messaging 계약이 share upload/JSON/publish locking cases와 섞여 있어 reviewability가 낮았다.

## Changes

- `tests/cli-publish-cache-helpers.ts`를 추가해 temp repo/home setup, cached upload binding/payload hash fixture, publish CLI execution, metadata/token preflight test server helpers를 공유한다.
- `tests/cli-publish-cache.test.ts`를 추가해 다음 direct publish cached-upload 계약을 분리했다.
  - 다른 credential binding의 cached upload는 재사용하지 않고 confirmation을 요구한다.
  - cached upload binding이 재사용 불가하면 ingest 전에 API compatibility를 확인한다.
  - reusable cached upload도 token status check를 통과해야 재사용한다.
  - reusable cached upload는 forced confirmation을 건너뛰고 review URL을 재사용한다.
  - high-severity private review draft publish output은 privacy policy와 saved-secret redaction을 명확히 보장한다.
- `tests/cli-share.test.ts`에서는 해당 5개 cases를 제거하고 share upload, JSON upload, direct publish JSON, locking, handoff warning cases를 유지했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Targeted split: npm test -- --run tests/cli-publish-cache.test.ts tests/cli-share.test.ts: 2 files / 30 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 121 files / 848 tests passed
Git whitespace: git diff --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 1696 pure LOC
tests/cli-publish-cache-helpers.ts: 166 pure LOC
tests/cli-publish-cache.test.ts: 195 pure LOC
```

## Follow-up

> [!todo]
> `tests/cli-share.test.ts` remains oversized at 1696 pure LOC. Continue behavior-preserving splits by cohesive groups: upload preflight failures, share JSON upload/output side effects, publish JSON handoff, publish locking, and human handoff warning coverage. Keep targeted verification plus full CLI suite before each commit.
