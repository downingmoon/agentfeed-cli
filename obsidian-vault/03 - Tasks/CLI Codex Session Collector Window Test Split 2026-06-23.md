---
title: CLI Codex Session Collector Window Test Split 2026-06-23
aliases:
  - CLI Codex session collector window test split
  - Codex session collector window split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: d3f3e362d1d60925c1f48dd3b2fb495d9e3f4dcc
---

# CLI Codex Session Collector Window Test Split 2026-06-23

> [!success]
> Near-ceiling `tests/session-collector.test.ts`에서 Codex-specific collection window/edit/token-baseline coverage를 `tests/session-collector-codex-window.test.ts`로 분리하고 shared temp git project fixture 및 JSONL writer를 `tests/session-collector-window-helpers.ts`로 통합했다.

## 변경 내용

- `tests/session-collector.test.ts`
  - multi-source idle-gap auto slicing.
  - no-row collection window filtering.
  - Claude boundary filtering.
  - Gemini boundary filtering and duration clamp.
  - 195 pure LOC 후보에서 117 pure LOC로 축소.
- `tests/session-collector-codex-window.test.ts`
  - Codex explicit `--since` edit/token filtering.
  - timestamp-less Codex edit exclusion under explicit window.
  - Codex cumulative token baseline subtraction.
  - OMX cumulative metadata non-override for windowed Codex delta.
  - 72 pure LOC.
- `tests/session-collector-window-helpers.ts`
  - shared temp git project fixture.
  - shared JSONL writer.
  - 32 pure LOC.

## 검증

- Baseline: `npm test -- --run tests/session-collector.test.ts` → 1 file / 9 tests passed.
- Targeted split: `npm test -- --run tests/session-collector.test.ts tests/session-collector-codex-window.test.ts` → 2 files / 9 tests passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 225 files / 848 tests passed.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, and tests were used as fallback evidence.

## 후행 과제

- 다음 190+ pure LOC 후보:
  - `tests/cli-publish-cache.test.ts` — 195 pure LOC.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.

## 관련

- [[CLI Credential Resolution Validation Test Split 2026-06-23]]
- [[Active Tasks]]
