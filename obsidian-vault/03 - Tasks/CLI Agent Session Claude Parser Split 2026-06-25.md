---
title: CLI Agent Session Claude Parser Split 2026-06-25
aliases:
  - CLI Agent Session Claude Parser Split
status: completed
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - collector
  - agent-session
created: 2026-06-25
updated: 2026-06-25
---

# CLI Agent Session Claude Parser Split 2026-06-25

## 목적

`src/collectors/agent-session.ts`에 마지막으로 남아 있던 Claude JSONL parser와 OMC metadata reader를 source-specific module로 분리했다. 신규 기능 없이 collector dispatch module을 얇게 유지해 CLI agent metrics 산출 경로의 리뷰 가능성과 유지보수성을 높였다.

> [!success] 완료 판정
> Claude session parser를 `src/collectors/agent-session-claude.ts`로 분리하고, OMC metadata reader를 `src/collectors/agent-session-claude-omc.ts`로 분리했다. `collectAgentSessionMetrics`, `AgentSessionMetrics`, `sessionFileBelongsToProject` public export는 유지했다.

## 변경 내용

- `src/collectors/agent-session-claude.ts` 추가.
  - Claude JSONL transcript row parsing
  - token/cost/command/test/tool/file/subagent metric accumulation
  - collection window filtering and finalize path 유지
  - OMC metadata merge 호출
- `src/collectors/agent-session-claude-omc.ts` 추가.
  - `.omc/sessions/<sessionId>.json` cost/subagent/mode metadata reader
  - `~/.claude/.session-stats.json` total call fallback reader
- `src/collectors/agent-session.ts`는 source별 parser dispatch와 public re-export만 유지한다.

## LOC 결과

| 파일 | 이전 pure LOC | 이후 pure LOC |
| --- | ---: | ---: |
| `src/collectors/agent-session.ts` | 170 | 29 |
| `src/collectors/agent-session-claude.ts` | 없음 | 116 |
| `src/collectors/agent-session-claude-omc.ts` | 없음 | 43 |

## 검증

- LSP diagnostics
  - `src/collectors/agent-session.ts`: `Transport closed`
  - `src/collectors/agent-session-claude.ts`: `Transport closed`
  - `src/collectors/agent-session-claude-omc.ts`: `Transport closed`
  - 대체 검증: TypeScript typecheck, build, targeted/full tests, built CLI smoke
- Baseline targeted Claude/session suite before edit: 4 files / 23 tests passed
- `npm run typecheck`: passed
- `npm run build`: passed
- Targeted Claude/session suite: 4 files / 23 tests passed
- Full CLI suite with `--hookTimeout=30000`: 226 files / 848 tests passed
- Built CLI Claude smoke:
  - `init --project-name agentfeed-claude-smoke --json` passed
  - `collect --source claude-code --session-file <tmp>/claude-session.jsonl --json --force --all --no-save-cursor --no-upload` passed
  - 확인값: `source=claude_code`, `tokens_used=15`, `commands_run=1`, `tests_run=1`, `collection_sources=[agent_session:claude_code]`
- `git diff --check`: passed
- changed-file LOC audit: all touched source files under 250 pure LOC
- changed-file no-excuse grep audit: no `as any`, `: any`, `@ts-ignore`, `@ts-expect-error`, or comments hits

## 커밋

- `e90e0f3 Split agent session Claude parser`

## 처리한 이전 후행 과제

- [[CLI Agent Session Codex Parser Split 2026-06-23]]에 남긴 “Claude parser와 OMC metadata reader를 source-specific module로 분리” 후행 과제를 완료했다.

## 후행 과제

> [!todo]
> 서버/인프라/CI/CD 변경 및 배포는 하지 않았다. 활성 goal의 최신 제약인 서버 배포 금지를 유지한다.

- `src/collectors/agent-session.ts`는 29 pure LOC dispatch module이 됐다.
- `src/collectors/agent-session-codex.ts`는 218 pure LOC warning band다. Codex schema handling이 늘어나면 token/tool-call helpers부터 추가 split을 우선한다.
- 다음 품질 pass에서는 CLI collector 외의 계약 불일치 후보를 다시 스캔해 source-specific parser split 이후 남은 CLI-Frontend-Backend mismatch를 확인한다.

## 관련 문서

- [[Active Tasks]]
- [[CLI Agent Session Codex Parser Split 2026-06-23]]
- [[CLI Agent Session Gemini Parser Split 2026-06-23]]
- [[CLI Agent Session File Discovery Split 2026-06-23]]
