---
title: CLI Upload Confirmation Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI upload confirmation test split
  - CLI upload confirmation test split
---

# CLI Upload Confirmation Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 share/publish human-readable upload confirmation gate 계약을 `cli-upload-confirmation` suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `171f724 Split CLI upload confirmation tests`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-upload-confirmation.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / human upload confirmation gate isolation

## Background

`tests/cli-share.test.ts`는 publish locking split 이후에도 652 pure LOC였고, share upload confirmation, direct publish confirmation, CI fresh publish intent, and `--yes` bypass contracts가 human output, auto-open policy, and handoff warning coverage와 섞여 있었다. Confirmation behavior는 upload safety gate로 독립적인 책임이므로 별도 suite로 이동했다.

## Changes

- `tests/cli-upload-confirmation.test.ts`를 추가해 다음 계약을 분리했다.
  - interactive `agentfeed share`는 `--yes` 없이 upload하지 않고 confirmation guidance를 출력한다.
  - direct interactive `agentfeed publish`는 forced confirmation 환경에서 upload하지 않고 preview/publish guidance를 출력한다.
  - CI fresh human-readable publish도 명시적 upload intent 없이 upload하지 않는다.
  - `--yes`는 forced confirmation 환경에서도 upload를 진행하고 browser handoff side effect 없이 human completion output을 출력한다.
- `tests/cli-share.test.ts`에서 해당 4개 cases를 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/cli-share.test.ts: 1 file / 10 tests passed
Targeted split: npm test -- --run tests/cli-upload-confirmation.test.ts tests/cli-share.test.ts: 2 files / 10 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 130 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 455 pure LOC
tests/cli-upload-confirmation.test.ts: 204 pure LOC
```

## Follow-up

> [!todo]
> `tests/cli-share.test.ts` remains oversized at 455 pure LOC. Continue behavior-preserving splits by cohesive groups: publish review URL auto-open policy, human handoff warnings, and remaining human share upload completion/dry-run command coverage. Keep targeted verification plus full CLI suite before each commit.
