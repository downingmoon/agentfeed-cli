---
title: Frontend Project Detail Mutation Source Assertion Helper Split 2026-06-25
aliases:
  - Project detail mutation source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Project Detail Mutation Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/project-detail-mutation-source-assertions.ts`가 30 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 project detail mutation source-contract 문자열 검사를 flow, error, UI helpers로 분리했다.

## 변경

- `project-detail-mutation-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `project-detail-mutation-flow-source-assertions.ts`
  - `project-detail-mutation-error-source-assertions.ts`
  - `project-detail-mutation-ui-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 이 문서화 후 전체 unpushed counter가 6 commits가 되어 threshold push/deploy 대상이다.

## Commit

- `agentfeed-frontend` `295d845` — `Split project detail mutation source assertions`

## 검증

- `npm run test:contracts -- src/lib/public-profile-source-contract.test.ts` 통과.
- `npm run test:contracts` 통과.
- `npm run lint` 통과. (`tsc --noEmit`)
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` 통과. Next.js 18 static pages generated. 기존 multi-lockfile workspace-root warning만 발생.
- Changed-file no-excuse grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, eslint-disable, TODO/FIXME 없음.
- Changed-file LOC audit 통과.
- `git diff --check` 통과.
- LSP diagnostics는 기존처럼 `Transport closed`; `tsc --noEmit`, contract tests, build로 대체 검증.
- Visual QA 미실행: runtime/UI 변경 없는 source-contract helper refactor.

## Size audit

```text
 8 src/lib/project-detail-mutation-source-assertions.ts
13 src/lib/project-detail-mutation-flow-source-assertions.ts
11 src/lib/project-detail-mutation-error-source-assertions.ts
14 src/lib/project-detail-mutation-ui-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
30 src/lib/discovery-explore-source-assertions.ts
30 src/lib/brand-svg-source-assertions.ts
29 src/lib/worklog-detail-data-source-assertions.ts
29 src/lib/api-boundary-public-user-source-assertions.ts
26 src/lib/feed-filter-source-assertions.ts
26 src/lib/brand-agent-glyph-source-assertions.ts
26 src/lib/auth-shell-session-source-assertions.ts
25 src/lib/worklog-review-action-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `project-detail-mutation-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidates are `discovery-explore-source-assertions.ts` and `brand-svg-source-assertions.ts` at 30 pure LOC.
- [ ] Current unpushed commit counter after docs: 6 commits; run threshold push/deploy from current server local shell. No SSH to `trading-bot`.
