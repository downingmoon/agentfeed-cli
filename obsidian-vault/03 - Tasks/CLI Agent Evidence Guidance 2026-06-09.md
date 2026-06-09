---
title: CLI Agent Evidence Guidance 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/cli
  - collection
  - diagnostics
  - enterprise-readiness
status: done
aliases:
  - CLI Agent Evidence Guidance
---

# CLI Agent Evidence Guidance 2026-06-09

> [!success] 완료
> `agentfeed collect --explain` / `agentfeed share --dry --explain`에서 agent evidence 누락을 단순 빈값처럼 보이지 않게 안내를 강화했다.

## 배경

AgentFeed의 핵심 가치는 Claude Code, Codex, Gemini, Cursor 및 플러그인 세션에서 토큰/모델/tool call/command/파일 변경 evidence를 최대한 수집하는 것이다. 그런데 evidence가 없거나 low-quality일 때 기존 안내는 “git-diff 기반일 수 있음” 정도만 말해, 사용자가 멀티에이전트 누락을 심각한 품질 문제로 인지하기 어려웠다.

## 변경

- `src/draft/collection-diagnostics.ts`
  - agent evidence 불완전 시 누락 가능한 항목을 명시했다.
    - tokens
    - tool calls
    - commands
    - models
    - per-agent attribution
  - evidence 없음과 low-quality evidence를 구분해 안내한다.
  - 멀티에이전트 사용 시 `Sources`에 각 agent가 보이는지 확인하거나 `--source` / `--session-file`로 재수집하라는 행동 지침을 추가했다.
- Regression tests 갱신
  - `tests/explain.test.ts`
  - `tests/share.test.ts`

## 검증

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- tests/explain.test.ts tests/share.test.ts tests/cli-collect.test.ts
npm run typecheck
npm run build
```

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

> [!note] 결과
> CLI targeted tests `39 passed`, typecheck/build 통과, OpenAPI contract gate 통과.

## 후행 과제

- CLI collector 내부에서 explicit `--session-file`이 읽히지 않거나 파싱 불가능할 때, 별도 warning channel로 더 직접적인 원인을 표시하는 개선을 검토한다.
- 단, 새 API/Backend contract 필드 추가가 필요하면 먼저 문서화하고 별도 패스로 진행한다.

## 배포

> [!warning]
> 현재 goal 규칙에 따라 서버 배포는 수행하지 않았다.
