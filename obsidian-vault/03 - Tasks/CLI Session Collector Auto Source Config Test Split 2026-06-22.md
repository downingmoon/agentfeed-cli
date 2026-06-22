---
title: CLI Session Collector Auto Source Config Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI session collector auto source config test split
  - CLI session collector auto source config test split
---

# CLI Session Collector Auto Source Config Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 auto source selection/config coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `4ab36a7 Split CLI session collector auto source config tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-auto-source-config.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / auto source selection and enabled-agent config suite isolation

## Background

[[CLI Session Collector File Guardrail Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` oversized state 중 enabled agent config / auto aggregation cluster를 처리했다. 이번 pass는 enabled agent aggregation, disabled-agent filtering, explicit source override, and explicit Gemini session-file auto-detection contracts만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-auto-source-config.test.ts` 추가.
  - Enabled Claude+Codex sessions를 첫 auto source에서 멈추지 않고 aggregate하는 계약을 보존했다.
  - Disabled agent config를 auto-select 때 존중하는 계약을 보존했다.
  - Explicit source가 disabled agent config를 override하는 계약을 보존했다.
  - Source 없이 explicit Gemini session file을 받은 collect가 Gemini CLI로 auto-detect하는 계약을 보존했다.
- `tests/session-collector.test.ts`에서 auto source/config cluster test cases를 제거했다.
- 원본 suite에서 더 이상 필요 없는 HOME restoration fixture를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "aggregates enabled agent sessions|respects enabled agent config|explicit source to override disabled agent config|auto-detects Gemini CLI": 1 file / 4 tests passed / 29 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-auto-source-config.test.ts -t "aggregates enabled agent sessions|respects enabled agent config|explicit source to override disabled agent config|auto-detects Gemini CLI": 1 file passed / 1 skipped, 4 tests passed / 29 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-auto-source-config.test.ts: 2 files / 33 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 168 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new auto source config suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 623 pure LOC after split; still oversized.
tests/session-collector-auto-source-config.test.ts: 143 pure LOC.
```

## Follow-up

> [!todo]
> `tests/session-collector.test.ts` remains oversized at 623 pure LOC. Continue only by cohesive behavior clusters such as remaining draft integration, Gemini metrics, OMX/generic metadata, generic metadata, or collection window filtering. Preserve baseline coverage before each split.
