---
title: Frontend API Boundary Source Assertion Helper Split 2026-06-25
aliases:
  - API boundary source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend API Boundary Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/api-boundary-source-assertions.ts`가 175 pure LOC로 source assertion helper 중 가장 큰 growth-risk 파일이었다. Runtime 동작은 바꾸지 않고 기존 source-contract 문자열 검사를 domain helper 5개로 분리했다.

## 변경

- `api-boundary-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `api-boundary-pagination-source-assertions.ts`
  - `api-boundary-enum-source-assertions.ts`
  - `api-boundary-public-user-source-assertions.ts`
  - `api-boundary-worklog-source-assertions.ts`
  - `api-boundary-project-dashboard-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `3b1f4c9` — `Split API boundary source assertions`

## 검증

- `npm run test:contracts -- src/lib/api-boundary-source-contract.test.ts` 통과.
- `npm run test:contracts` 통과.
- `npm run lint` 통과. (`tsc --noEmit`)
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` 통과. Next.js 18 static pages generated. 기존 multi-lockfile workspace-root warning만 발생.
- Changed-file no-excuse grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, eslint-disable, TODO/FIXME 없음.
- Changed-file non-null assertion scan 통과.
- `git diff --check` 통과.
- LSP diagnostics는 기존처럼 `Transport closed`; `tsc --noEmit`, contract tests, build로 대체 검증.
- Visual QA 미실행: runtime/UI 변경 없는 source-contract helper refactor.

## Size audit

```text
12 src/lib/api-boundary-source-assertions.ts
12 src/lib/api-boundary-pagination-source-assertions.ts
67 src/lib/api-boundary-enum-source-assertions.ts
29 src/lib/api-boundary-public-user-source-assertions.ts
51 src/lib/api-boundary-worklog-source-assertions.ts
32 src/lib/api-boundary-project-dashboard-source-assertions.ts
```

Current source assertion helper re-scan top:

```text
164 src/lib/discovery-dashboard-source-assertions.ts
154 src/lib/settings-source-assertions.ts
131 src/lib/feed-source-assertions.ts
124 src/lib/worklog-card-source-assertions.ts
96 src/lib/auth-shell-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `api-boundary-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `discovery-dashboard-source-assertions.ts` at 164 pure LOC.
- [ ] Keep `api-boundary-source-assertions.ts` as thin orchestrator only.
- [ ] Server/infra/CI/CD work still on hold. No server deploy in this task.
