---
title: CLI Codex Patch Session Collector Metrics Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI Codex patch session collector metrics test split
  - CLI Codex patch session collector metrics test split
---

# CLI Codex Patch Session Collector Metrics Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 Codex patch/apply_patch evidence, model fallback, line-count metrics, failed patch exclusion coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `31d64e8 Split CLI Codex patch session collector metrics tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-codex-patch-metrics.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / Codex session collector patch metrics suite isolation

## Background

[[CLI Claude Session Collector Metrics Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` oversized state 중 Codex patch/apply_patch metrics cluster를 처리했다. 이번 pass는 Codex session JSONL parsing behavior 중 patch evidence and changed-file metrics coverage만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-codex-patch-metrics.test.ts` 추가.
  - Codex `patch_apply_end` changed-file evidence, line-count metrics, token accounting, failed test command accounting 계약을 보존했다.
  - `turn_context` row에서 Codex model fallback을 추출하는 계약을 보존했다.
  - structured `patch_apply_end`가 없을 때 `apply_patch` custom tool input에서 changed-file evidence를 fallback 수집하는 계약을 보존했다.
  - failed `apply_patch` custom tool input과 paired failed tool output은 changed files에 포함하지 않는 계약을 보존했다.
  - structured patch evidence에 없는 fallback-only files를 보존하는 계약을 보존했다.
- `tests/session-collector.test.ts`에서 Codex patch/apply_patch metrics cluster test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "Codex patch|Codex model|Codex reasoning|Codex unified_diff|failed apply_patch|Codex exec commands|failed Codex exec|Codex apply_patch": 1 file / 6 tests passed / 53 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-codex-patch-metrics.test.ts -t "Codex patch|Codex model|Codex reasoning|Codex unified_diff|failed apply_patch|Codex exec commands|failed Codex exec|Codex apply_patch": 1 file passed / 1 skipped, 6 tests passed / 53 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-codex-patch-metrics.test.ts: 2 files / 59 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 164 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new Codex patch metrics suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 1077 pure LOC after split; still oversized.
tests/session-collector-codex-patch-metrics.test.ts: 141 pure LOC.
```

## Follow-up

> [!success]
> Command/test runner recognition follow-up was completed by [[CLI Codex Command Session Collector Metrics Test Split 2026-06-22]]. `tests/session-collector.test.ts` is now 958 pure LOC.

> [!todo]
> `tests/session-collector.test.ts` remains oversized at 958 pure LOC. Continue only by cohesive behavior clusters such as session ownership/discovery, Gemini metrics, OMX/generic metadata, draft integration, or collection window filtering. Preserve baseline coverage before each split.
