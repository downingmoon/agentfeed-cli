---
title: CLI Session Collector Generic Metadata Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI session collector generic metadata test split
  - CLI session collector generic metadata test split
---

# CLI Session Collector Generic Metadata Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 generic/Cursor metadata coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `0437099 Split CLI session collector generic metadata tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-generic-metadata.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / generic and Cursor metadata suite isolation

## Background

[[CLI Session Collector OMC OMX Metadata Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` oversized state 중 generic metadata cluster를 처리했다. 이번 pass는 unknown plugin fallback, generic timestamp window filtering, explicit cost handling, Cursor metadata parsing/auto-collection, and malformed file URI tolerance contracts만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-generic-metadata.test.ts` 추가.
  - Generic plugin metadata fallback and collection source quality evidence 계약을 보존했다.
  - Generic metadata timestamp-less row exclusion, timestamp aliases, numeric epoch, since/until filtering 계약을 보존했다.
  - Explicit USD cost capture and draft-level include-estimated-cost gating 계약을 보존했다.
  - Cursor metadata parsing and project-local Cursor auto-collection 계약을 보존했다.
  - Malformed `file://` URI metadata path가 collection 전체를 중단하지 않는 fail-soft 계약을 보존했다.
- `tests/session-collector.test.ts`에서 generic/Cursor metadata cluster test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "generic plugin signals|timestamp-less generic metadata|generic plugin metadata|explicit USD cost|estimated cost collection|Cursor metadata|malformed file URI|project-local Cursor metadata": 1 file / 10 tests passed / 13 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-generic-metadata.test.ts -t "generic plugin signals|timestamp-less generic metadata|generic plugin metadata|explicit USD cost|estimated cost collection|Cursor metadata|malformed file URI|project-local Cursor metadata": 1 file passed / 1 skipped, 10 tests passed / 13 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-generic-metadata.test.ts: 2 files / 23 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 171 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new generic metadata suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 280 pure LOC after split; still above 250 ceiling.
tests/session-collector-generic-metadata.test.ts: 212 pure LOC.
```

## Follow-up

> [!todo]
> `tests/session-collector.test.ts` remains oversized at 280 pure LOC. One more cohesive split should bring it under the 250 pure LOC ceiling. Best remaining candidates: draft integration/evidence-path filtering, or collection window filtering. Preserve baseline coverage before each split.
