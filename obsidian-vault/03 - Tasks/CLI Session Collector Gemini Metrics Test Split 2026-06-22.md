---
title: CLI Session Collector Gemini Metrics Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI session collector Gemini metrics test split
  - CLI session collector Gemini metrics test split
---

# CLI Session Collector Gemini Metrics Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 Gemini CLI metrics coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `bec8444 Split CLI session collector Gemini metrics tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-gemini-metrics.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / Gemini CLI metrics suite isolation

## Background

[[CLI Session Collector Auto Source Config Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` oversized state 중 Gemini CLI metrics cluster를 처리했다. 이번 pass는 Gemini tool-call counting, token/session duration extraction, successful edit evidence, failed skill/subagent exclusion, and failed edit exclusion contracts만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-gemini-metrics.test.ts` 추가.
  - Gemini CLI `toolCalls`, Superpowers skill activation, token totals, command/test result parsing, and changed-file evidence 계약을 보존했다.
  - Failed Gemini skill activation and failed agent invocation이 completed usage로 집계되지 않는 계약을 보존했다.
  - Failed Gemini `write_file`/`replace` edits가 changed file/line metrics로 집계되지 않는 계약을 보존했다.
- `tests/session-collector.test.ts`에서 Gemini metrics cluster test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "extracts Gemini CLI tool calls|failed Gemini skill|failed Gemini file edits": 1 file / 3 tests passed / 26 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-gemini-metrics.test.ts -t "extracts Gemini CLI tool calls|failed Gemini skill|failed Gemini file edits": 1 file passed / 1 skipped, 3 tests passed / 26 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-gemini-metrics.test.ts: 2 files / 29 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 169 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new Gemini metrics suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

> [!info]
> 검증 중 `npm run build`와 `npm test -- --run`을 병렬 실행했을 때 `dist/` partial emit 상태를 CLI subprocess가 읽어 transient failure가 발생했다. Build 완료 후 full suite를 순차 재실행해 169 files / 848 tests 통과로 확인했다.

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 558 pure LOC after split; still oversized.
tests/session-collector-gemini-metrics.test.ts: 90 pure LOC.
```

## Follow-up

> [!todo]
> `tests/session-collector.test.ts` remains oversized at 558 pure LOC. Continue only by cohesive behavior clusters such as remaining draft integration, OMC/OMX session metadata, generic metadata, or collection window filtering. Preserve baseline coverage before each split.
