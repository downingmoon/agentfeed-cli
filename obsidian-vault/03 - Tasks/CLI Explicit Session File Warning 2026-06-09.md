---
title: CLI Explicit Session File Warning 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/cli
  - collection
  - diagnostics
  - enterprise-readiness
status: done
aliases:
  - CLI Explicit Session File Warning
---

# CLI Explicit Session File Warning 2026-06-09

> [!success] 완료
> 사용자가 `--session-file`을 명시했는데 해당 파일이 없거나 usable agent metrics를 만들지 못하는 경우를 더 이상 조용히 숨기지 않고 collect/share warning으로 노출한다.

## 변경 배경

AgentFeed의 핵심 플로우는 agent session evidence를 기반으로 worklog를 만드는 것이다. 명시 session file이 실패했는데 CLI가 git diff 기반 draft만 조용히 만들면, 사용자는 토큰/모델/tool call/command/per-agent attribution 누락을 알아차리기 어렵다.

## 변경 사항

- `src/draft/create.ts`
  - `CollectDraftStatus`에 로컬 `warnings`를 추가했다.
  - explicit `--session-file` 지정 후 session metrics가 없으면 warning을 생성한다.
  - 파일 없음과 파일은 있으나 usable metrics 없음 상황을 구분한다.
- `src/cli/index.ts`
  - collect/share human output과 JSON output의 기존 warnings 배열에 collection warning을 병합한다.
- `tests/cli-collect.test.ts`
  - missing `--session-file` human warning regression 추가.
  - parse/unusable `--session-file` JSON warning regression 추가.

## 검증

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- tests/cli-collect.test.ts tests/explain.test.ts tests/share.test.ts
npm run typecheck
npm run build
npm test
```

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

> [!note] 결과
> Targeted tests `41 passed`, 전체 CLI tests `573 passed`, typecheck/build 통과, OpenAPI contract gate 통과.

## 후행 과제

- `collectAgentSessionMetrics` 내부에서 unsupported source/window mismatch/project mismatch를 더 세분화한 diagnostic reason으로 반환하는 구조는 별도 검토 대상이다.
- 이 패스는 Backend/API contract를 변경하지 않는 CLI 로컬 품질 보강으로 제한했다.

## 배포

> [!warning]
> 현재 goal 규칙에 따라 서버 배포는 수행하지 않았다.
