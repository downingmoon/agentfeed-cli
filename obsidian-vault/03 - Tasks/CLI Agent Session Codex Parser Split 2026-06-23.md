---
title: CLI Agent Session Codex Parser Split 2026-06-23
aliases:
  - CLI Agent Session Codex Parser Split
status: completed
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - collector
  - agent-session
created: 2026-06-23
updated: 2026-06-23
---

# CLI Agent Session Codex Parser Split 2026-06-23

## 목적

`src/collectors/agent-session.ts`가 Claude parser, Codex parser, Codex patch fallback, OMX metadata merge를 함께 보유해 source-specific collector 책임이 남아 있었다. 신규 기능 없이 Codex session parsing을 독립 module로 분리해 CLI agent metrics collector의 리뷰 가능성과 CLI-Frontend-Backend 계약 metric 산출 경로의 유지보수성을 높였다.

> [!success] 완료 판정
> Codex JSONL session parser를 `src/collectors/agent-session-codex.ts`로 분리하고, Codex apply_patch fallback parser와 OMX metadata reader를 각각 `src/collectors/agent-session-codex-patch.ts`, `src/collectors/agent-session-codex-omx.ts`로 분리했다. `collectAgentSessionMetrics`와 `AgentSessionMetrics` public API/export는 유지했다.

## 변경 내용

- `src/collectors/agent-session-codex.ts` 추가.
  - Codex token total 계산
  - Codex function/custom tool call, command/test/subagent metric 누적
  - structured `patch_apply_end` changed-file evidence 처리
  - apply_patch fallback과 OMX metadata merge 호출
- `src/collectors/agent-session-codex-patch.ts` 추가.
  - Codex `apply_patch` text fallback changed-file parser
- `src/collectors/agent-session-codex-omx.ts` 추가.
  - `.omx/metrics.json` token/cost metadata reader
  - `.omx/state/subagent-tracking.json` subagent/turn/mode metadata reader
- `src/collectors/agent-session.ts`는 Codex parser를 import하고 Claude/Gemini/generic dispatch 책임만 유지한다.

## LOC 결과

| 파일 | 이전 pure LOC | 이후 pure LOC |
| --- | ---: | ---: |
| `src/collectors/agent-session.ts` | 449 | 170 |
| `src/collectors/agent-session-codex.ts` | 없음 | 218 |
| `src/collectors/agent-session-codex-patch.ts` | 없음 | 30 |
| `src/collectors/agent-session-codex-omx.ts` | 없음 | 47 |

## 검증

- LSP diagnostics
  - `src/collectors/agent-session.ts`: `Transport closed`
  - `src/collectors/agent-session-codex.ts`: `Transport closed`
  - `src/collectors/agent-session-codex-patch.ts`: `Transport closed`
  - `src/collectors/agent-session-codex-omx.ts`: `Transport closed`
  - 대체 검증: TypeScript typecheck, build, targeted/full tests, built CLI smoke
- Baseline targeted Codex/session suite before edit: 5 files / 27 tests passed
- `npm run typecheck`: passed
- `npm run build`: passed
- Targeted Codex/session suite: 5 files / 27 tests passed
- Full CLI suite with `--hookTimeout=30000`: 226 files / 848 tests passed
- Built CLI smoke:
  - `init --project-name agentfeed-smoke-project --json` passed
  - `collect --source other --json --force --no-save-cursor` passed
  - saved draft file `.agentfeed/drafts/<id>.json` existed
- `git diff --check`: passed
- changed-file LOC audit: all touched source files under 250 pure LOC
- new-module grep audit: no `as any`, `: any`, `@ts-ignore`, `@ts-expect-error`, or comments hits

## 커밋

- `f49831b Split agent session Codex parser`

## 후행 과제

> [!todo]
> 서버/인프라/CI/CD 변경 및 배포는 하지 않았다. 활성 goal의 최신 제약인 서버 배포 금지를 유지한다.

- `src/collectors/agent-session.ts`는 170 pure LOC로 collector dispatch/Claude parser file size는 안정권에 들어왔다.
- 다음 품질 pass에서는 Claude parser와 OMC metadata reader를 source-specific module로 분리해 `agent-session.ts`를 pure dispatch module에 더 가깝게 만들 수 있다.
- `src/collectors/agent-session-codex.ts`는 218 pure LOC로 warning band다. Codex schema handling이 늘어나면 token/tool-call helpers부터 추가 split을 우선한다.

## 관련 문서

- [[Active Tasks]]
- [[CLI Agent Session Gemini Parser Split 2026-06-23]]
- [[CLI Agent Session File Discovery Split 2026-06-23]]
