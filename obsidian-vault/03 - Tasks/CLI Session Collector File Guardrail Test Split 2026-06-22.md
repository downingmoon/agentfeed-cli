---
title: CLI Session Collector File Guardrail Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI session collector file guardrail test split
  - CLI session collector file guardrail test split
---

# CLI Session Collector File Guardrail Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 session file guardrail/pathological row coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `6345dc6 Split CLI session collector file guardrail tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-file-guardrails.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / session file guardrail suite isolation

## Background

[[CLI Session Collector Ownership Discovery Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` oversized state 중 session file guardrails/pathological rows cluster를 처리했다. 이번 pass는 file byte caps, JSONL line/row caps, and oversized tail parsing contracts만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-file-guardrails.test.ts` 추가.
  - Oversized explicit agent session files를 parsing 전에 reject하는 계약을 보존했다.
  - Pathological JSONL lines를 skip하면서 bounded valid session identity는 유지하는 계약을 보존했다.
  - Long Codex session이 row cap을 넘을 때 newest JSONL rows를 유지하는 계약을 보존했다.
  - Oversized Codex session file에서도 tail을 읽어 agent evidence를 보존하는 계약을 보존했다.
- `tests/session-collector.test.ts`에서 file guardrail/pathological row cluster test cases를 제거했다.
- 원본 suite에서 더 이상 필요 없는 `AGENTFEED_SESSION_*` env reset과 `sessionFileBelongsToProject` import를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "oversized explicit agent session files|pathological JSONL lines|newest JSONL rows|tail of oversized Codex session files": 1 file / 4 tests passed / 33 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-file-guardrails.test.ts -t "oversized explicit agent session files|pathological JSONL lines|newest JSONL rows|tail of oversized Codex session files": 1 file passed / 1 skipped, 4 tests passed / 33 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-file-guardrails.test.ts: 2 files / 37 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 167 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new file guardrail suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 740 pure LOC after split; still oversized.
tests/session-collector-file-guardrails.test.ts: 111 pure LOC.
```

## Follow-up

> [!todo]
> `tests/session-collector.test.ts` remains oversized at 740 pure LOC. Continue only by cohesive behavior clusters such as remaining draft integration, enabled agent config / auto aggregation, Gemini metrics, OMX/generic metadata, or collection window filtering. Preserve baseline coverage before each split.
