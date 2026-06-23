---
title: CLI Agent Session Generic Collector Split 2026-06-23
aliases:
  - CLI Agent Session Generic Collector Split
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

# CLI Agent Session Generic Collector Split 2026-06-23

## 목적

CLI agent session collector가 Claude/Codex/Gemini/generic metadata parsing, collection window logic, changed-file summarization, metric finalization을 한 파일에 함께 보유해 `src/collectors/agent-session.ts`가 oversized 상태였다. 신규 기능 없이 generic metadata와 공통 collector helper를 분리해 CLI-Frontend-Backend 계약에 들어가는 worklog metrics 산출 경로의 리뷰 가능성과 회귀 검증성을 높였다.

> [!success] 완료 판정
> `src/collectors/agent-session.ts`에서 공통 metric/path/diff/finalize helper, collection window helper, generic metadata parser를 별도 모듈로 분리했다. Public import path `../collectors/agent-session.js`의 `AgentSessionMetrics` type export와 `collectAgentSessionMetrics` API는 유지했다.

## 변경 내용

- `src/collectors/agent-session-core.ts` 추가.
  - `AgentSessionMetrics` type
  - record/string/number parsing helper
  - cost extraction helper
  - changed-file path/diff/upsert helper
  - collection source merge/finalize helper
  - idle-gap effective collection window inference
- `src/collectors/agent-session-window.ts` 추가.
  - ISO/epoch timestamp parsing
  - collection window boundary parsing
  - row-in-window predicates
  - normalized collection window helper
- `src/collectors/agent-session-generic.ts` 추가.
  - generic metadata file discovery
  - JSON/JSONL metadata record parsing
  - generic changed-file normalization
  - generic metric accumulator and finalization
- `src/collectors/agent-session.ts`는 source-specific Claude/Codex/Gemini parsing, session file discovery, public collector entrypoint를 유지한다.

## LOC 결과

| 파일 | 이전 pure LOC | 이후 pure LOC |
| --- | ---: | ---: |
| `src/collectors/agent-session.ts` | 1157 | 752 |
| `src/collectors/agent-session-core.ts` | 없음 | 218 |
| `src/collectors/agent-session-generic.ts` | 없음 | 175 |
| `src/collectors/agent-session-window.ts` | 없음 | 65 |

## 검증

- LSP diagnostics
  - `src/collectors/agent-session.ts`: `Transport closed`
  - `src/collectors/agent-session-core.ts`: `Transport closed`
  - `src/collectors/agent-session-generic.ts`: `Transport closed`
  - `src/collectors/agent-session-window.ts`: `Transport closed`
  - 대체 검증: TypeScript typecheck, build, targeted/full tests, built CLI smoke
- `npm run typecheck`: passed
- `npm run build`: passed
- Targeted session collector suite: 13 files / 65 tests passed
- Full CLI suite:
  - default hook timeout run: 224 files passed, 2 help suites failed in `beforeAll` because `ensureCliBuilt` exceeded Vitest 10s hook timeout
  - failing help suites rerun with `--hookTimeout=30000`: 2 files / 14 tests passed
  - full rerun with `--hookTimeout=30000`: 226 files / 848 tests passed
- Built CLI smoke:
  - `init --project-name agentfeed-smoke-project --json` passed
  - `collect --source other --json --force --no-save-cursor` passed
  - saved draft file existed under `.agentfeed/drafts`
- `git diff --check`: passed
- new-module grep audit: no `as any`, `: any`, `@ts-ignore`, or `@ts-expect-error`; `file://` string literal only

## 커밋

- `b2c6ca4 Split agent session generic helpers`

## 후행 과제

> [!todo]
> 서버/인프라/CI/CD 변경 및 배포는 하지 않았다. 활성 goal의 최신 제약인 서버 배포 금지를 유지한다.

- `src/collectors/agent-session.ts`는 752 pure LOC로 아직 oversized다. 다음 pass에서는 Claude/Codex/Gemini parser를 source별 파일로 순차 분리해야 한다.
- Full suite 기본 실행은 built-CLI help suites의 `ensureCliBuilt` hook 10초 timeout에 취약하다. 제품 기능 변경 없이 테스트 harness timeout/빌드 캐시 정책을 별도 검토할 수 있다.
- `src/collectors/agent-session-core.ts`는 218 pure LOC로 안정권이지만, future edit에서 증가하면 path/diff helper를 별도 module로 분리한다.

## 관련 문서

- [[Active Tasks]]
- [[CLI Credential File Storage Split 2026-06-23]]
- [[CLI Draft Collection Helpers Split 2026-06-23]]
