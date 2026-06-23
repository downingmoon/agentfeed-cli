---
title: CLI Agent Session Gemini Parser Split 2026-06-23
aliases:
  - CLI Agent Session Gemini Parser Split
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

# CLI Agent Session Gemini Parser Split 2026-06-23

## 목적

`src/collectors/agent-session.ts`가 Claude/Codex/Gemini parser와 공통 command/tool status helper를 계속 함께 보유해 oversized 상태였다. 신규 기능 없이 Gemini session parser와 shared tooling helper를 분리해 source-specific parser 책임을 줄이고 다음 Codex/Claude parser split의 경계를 명확히 했다.

> [!success] 완료 판정
> Gemini JSONL session parser를 `src/collectors/agent-session-gemini.ts`로, command/test/tool failure 판정 helper를 `src/collectors/agent-session-tooling.ts`로 분리했다. `collectAgentSessionMetrics`와 `AgentSessionMetrics` public API/export는 유지했다.

## 변경 내용

- `src/collectors/agent-session-gemini.ts` 추가.
  - Gemini token total 계산
  - Gemini tool call 기반 changed-file/test/skill/subagent/session metric 누적
  - collection window boundary 적용
  - `gemini_cli` collection source finalization
- `src/collectors/agent-session-tooling.ts` 추가.
  - test command detection
  - command output failure detection
  - tool status failure detection
  - tool result content normalization
- `src/collectors/agent-session.ts`는 Gemini parser와 shared tooling helper를 import하도록 축소했다.

## LOC 결과

| 파일 | 이전 pure LOC | 이후 pure LOC |
| --- | ---: | ---: |
| `src/collectors/agent-session.ts` | 586 | 449 |
| `src/collectors/agent-session-gemini.ts` | 없음 | 100 |
| `src/collectors/agent-session-tooling.ts` | 없음 | 45 |

## 검증

- LSP diagnostics
  - `src/collectors/agent-session.ts`: `Transport closed`
  - `src/collectors/agent-session-gemini.ts`: `Transport closed`
  - `src/collectors/agent-session-tooling.ts`: `Transport closed`
  - 대체 검증: TypeScript typecheck, build, targeted/full tests, built CLI smoke
- `npm run typecheck`: passed
- `npm run build`: passed
- Targeted Gemini/session collector suite: 4 files / 21 tests passed
- Full CLI suite with `--hookTimeout=30000`: 226 files / 848 tests passed
- Built CLI smoke:
  - `init --project-name agentfeed-smoke-project --json` passed
  - `collect --source other --json --force --no-save-cursor` passed
  - saved draft file `.agentfeed/drafts/draft_20260623_052222_c27f.json` existed
- `git diff --check`: passed
- new-module grep audit: no `as any`, `: any`, `@ts-ignore`, `@ts-expect-error`, or comments hits

## 커밋

- `3493c59 Split agent session Gemini parser`

## 후행 과제

> [!todo]
> 서버/인프라/CI/CD 변경 및 배포는 하지 않았다. 활성 goal의 최신 제약인 서버 배포 금지를 유지한다.

- `src/collectors/agent-session.ts`는 449 pure LOC로 아직 oversized다. 다음 pass에서는 Codex parser/tool/patch parsing 또는 Claude parser/OMC metadata parsing을 독립 모듈로 분리해야 한다.
- `src/collectors/agent-session-gemini.ts`는 100 pure LOC로 안정권이다. Gemini schema가 늘어나면 token/tool-call accumulation helper부터 분리한다.

## 관련 문서

- [[Active Tasks]]
- [[CLI Agent Session File Discovery Split 2026-06-23]]
- [[CLI Agent Session Generic Collector Split 2026-06-23]]
