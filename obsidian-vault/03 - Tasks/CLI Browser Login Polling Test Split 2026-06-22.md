---
title: CLI Browser Login Polling Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI browser login polling test split
  - CLI browser login polling test split
---

# CLI Browser Login Polling Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 `waitForCliAuthExchange()` browser approval polling, transient retry, terminal failure, and timeout sleep-cap contracts를 focused polling suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `ff3cc65 Split CLI browser login polling tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-browser-login-polling.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / browser login polling policy suite isolation

## Background

[[CLI Browser Login Flow Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 browser authorization polling policy tests가 아직 남아 있었다. 이 케이스들은 `browserLogin()` orchestration fixture보다 lower-level `waitForCliAuthExchange()` retry/timeout policy에 응집돼 있어 별도 suite로 분리했다.

## Changes

- `tests/cli-browser-login-polling.test.ts` 추가.
  - pending session이 approval될 때까지 polling을 계속한다.
  - transient exchange failure는 재시도 후 성공한다.
  - terminal verifier failure는 retry/sleep 없이 즉시 실패한다.
  - polling sleep은 remaining timeout window를 넘지 않는다.
- `tests/api-hook.test.ts`에서 `waitForCliAuthExchange` import와 polling block을 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 68 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-browser-login-polling.test.ts: 2 files / 68 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 138 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 1,066 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-browser-login-polling.test.ts: 114 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null additions.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` remains oversized at 1,066 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. Likely next groups: publish timeout/retry/duplicate ingestion handling, upload response/review URL safety contracts, remote preview contract tests, or publish API error/friendly error handling.
