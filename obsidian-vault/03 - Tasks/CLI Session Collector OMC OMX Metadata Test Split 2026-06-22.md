---
title: CLI Session Collector OMC OMX Metadata Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI session collector OMC OMX metadata test split
  - CLI session collector OMC OMX metadata test split
---

# CLI Session Collector OMC OMX Metadata Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 OMC/OMX metadata coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `8f54370 Split CLI session collector OMC OMX metadata tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-omc-omx-metadata.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / OMC and OMX metadata suite isolation

## Background

[[CLI Session Collector Gemini Metrics Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` oversized state 중 OMC/OMX plugin metadata cluster를 처리했다. 이번 pass는 OMC Claude session summary merge, OMX session-id isolation, and OMX Codex subagent/turn/token/cost metadata merge contracts만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-omc-omx-metadata.test.ts` 추가.
  - OMC Claude session summaries and tool statistics가 raw transcript 없이 metrics로 merge되는 계약을 보존했다.
  - OMX subagent tracking이 다른 Codex session id에서 merge되지 않는 isolation 계약을 보존했다.
  - OMX Codex subagent tracking, turn metrics, token usage, estimated cost, and plugin metadata source evidence 계약을 보존했다.
- `tests/session-collector.test.ts`에서 OMC/OMX metadata cluster test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "OMC Claude session summaries|different Codex session id|OMX Codex subagent tracking": 1 file / 3 tests passed / 23 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-omc-omx-metadata.test.ts -t "OMC Claude session summaries|different Codex session id|OMX Codex subagent tracking": 1 file passed / 1 skipped, 3 tests passed / 23 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-omc-omx-metadata.test.ts: 2 files / 26 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 170 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new OMC/OMX metadata suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 465 pure LOC after split; still oversized.
tests/session-collector-omc-omx-metadata.test.ts: 118 pure LOC.
```

## Follow-up

> [!todo]
> `tests/session-collector.test.ts` generic metadata follow-up was completed in [[CLI Session Collector Generic Metadata Test Split 2026-06-22]]. It remains oversized after that pass; continue only by cohesive behavior clusters such as draft integration/evidence-path filtering or collection window filtering. Preserve baseline coverage before each split.
