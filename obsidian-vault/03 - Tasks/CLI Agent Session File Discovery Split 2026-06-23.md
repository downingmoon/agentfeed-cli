---
title: CLI Agent Session File Discovery Split 2026-06-23
aliases:
  - CLI Agent Session File Discovery Split
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

# CLI Agent Session File Discovery Split 2026-06-23

## 목적

`src/collectors/agent-session.ts`가 source-specific parser와 session file I/O/discovery/ownership guard를 함께 보유해 oversized 상태가 이어졌다. 신규 기능 없이 session file boundary를 분리해 자동 discovery, bounded JSONL read, cwd ownership guard의 리뷰 가능성과 회귀 검증성을 높였다.

> [!success] 완료 판정
> Session file size limit, JSONL tail parsing, structured cwd project matching, Claude/Codex/Gemini session file discovery를 `src/collectors/agent-session-files.ts`로 분리했다. 기존 public import path의 `sessionFileBelongsToProject` export는 `src/collectors/agent-session.ts`에서 re-export로 유지했다.

## 변경 내용

- `src/collectors/agent-session-files.ts` 추가.
  - `AGENTFEED_SESSION_FILE_MAX_BYTES`, `AGENTFEED_SESSION_JSONL_MAX_ROWS`, `AGENTFEED_SESSION_JSONL_MAX_LINE_CHARS` handling
  - bounded session file tail read
  - JSONL row parsing
  - structured `cwd` ownership matching and `sessionFileBelongsToProject`
  - Claude/Codex/Gemini session file discovery
- `src/collectors/agent-session.ts`는 source parser와 public collector entrypoint만 유지한다.
- `sessionFileBelongsToProject` public export path는 유지한다.

## LOC 결과

| 파일 | 이전 pure LOC | 이후 pure LOC |
| --- | ---: | ---: |
| `src/collectors/agent-session.ts` | 752 | 586 |
| `src/collectors/agent-session-files.ts` | 없음 | 177 |

## 검증

- LSP diagnostics
  - `src/collectors/agent-session-files.ts`: `Transport closed`
  - 대체 검증: TypeScript typecheck, build, targeted/full tests, built CLI smoke
- Baseline targeted discovery/session ownership tests before edit: 3 files / 18 tests passed
- `npm run typecheck`: passed
- `npm run build`: passed
- Targeted session discovery/guardrail suite: 4 files / 22 tests passed
- Full CLI suite with `--hookTimeout=30000`: 226 files / 848 tests passed
- Built CLI smoke:
  - `init --project-name agentfeed-smoke-project --json` passed
  - `collect --source other --json --force --no-save-cursor` passed
  - saved draft file existed under `.agentfeed/drafts`
- `git diff --check`: passed
- new-module grep audit: no `as any`, `: any`, `@ts-ignore`, or `@ts-expect-error`; only hit was the `replace(/\//g, '-')` regex literal

## 커밋

- `feafd2f Split agent session file discovery`

## 후행 과제

> [!todo]
> 서버/인프라/CI/CD 변경 및 배포는 하지 않았다. 활성 goal의 최신 제약인 서버 배포 금지를 유지한다.

- `src/collectors/agent-session.ts`는 586 pure LOC로 아직 oversized다. 다음 pass에서는 Codex patch/tool parsing, Claude stats/OMX metadata, Gemini tool parsing 중 하나를 독립 모듈로 분리해야 한다.
- `src/collectors/agent-session-files.ts`는 177 pure LOC로 안정권이지만 session discovery source가 늘어나면 source별 discovery helper split을 우선한다.

## 관련 문서

- [[Active Tasks]]
- [[CLI Agent Session Generic Collector Split 2026-06-23]]
