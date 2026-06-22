---
title: CLI Publish Locking Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI publish locking test split
  - CLI publish locking test split
---

# CLI Publish Locking Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 direct publish concurrent locking 계약을 `cli-publish-json-locking` suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `62a253e Split CLI publish locking test`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-publish-json-helpers.ts`
  - `tests/cli-publish-json-locking.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / publish upload lock isolation

## Background

`tests/cli-share.test.ts`는 publish JSON split 이후에도 733 pure LOC였고, direct `agentfeed publish --json` concurrent locking contract가 human-readable share/publish output and handoff warning coverage와 섞여 있었다. Locking behavior는 JSON publish upload boundary에 가깝기 때문에 `cli-publish-json-*` test group으로 이동했다.

## Changes

- `tests/cli-publish-json-locking.test.ts`를 추가해 두 개의 publish process가 같은 draft를 동시에 publish할 때 ingest request가 1회만 발생하고 second process가 saved upload를 reuse하는 계약을 분리했다.
- `tests/cli-publish-json-helpers.ts`에 `spawnAgentFeedJson()` shared helper를 추가해 CLI child process JSON runs를 publish JSON suites에서 재사용할 수 있게 했다.
- `tests/cli-share.test.ts`에서 locking case와 전용 `spawnAgentFeedJson()` helper/import를 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/cli-share.test.ts: 1 file / 11 tests passed
Targeted split: npm test -- --run tests/cli-publish-json-locking.test.ts tests/cli-share.test.ts: 2 files / 11 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 129 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 652 pure LOC
tests/cli-publish-json-helpers.ts: 177 pure LOC
tests/cli-publish-json-locking.test.ts: 88 pure LOC
```

## Follow-up

> [!todo]
> `tests/cli-share.test.ts` remains oversized at 652 pure LOC. Continue behavior-preserving splits by cohesive groups: human publish/share confirmation gates, publish review URL auto-open policy, and human handoff warnings. Keep targeted verification plus full CLI suite before each commit.
