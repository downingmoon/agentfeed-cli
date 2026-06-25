---
title: Frontend Discovery Dashboard Source Assertion Helper Split 2026-06-25
aliases:
  - Discovery dashboard source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Discovery Dashboard Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/discovery-dashboard-source-assertions.ts`가 164 pure LOC로 다음 source assertion growth-risk helper였다. Runtime 동작은 바꾸지 않고 Explore/Dashboard/Moderation/Notifications source-contract 문자열 검사를 domain helper 4개로 분리했다.

## 변경

- `discovery-dashboard-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `discovery-explore-source-assertions.ts`
  - `dashboard-source-assertions.ts`
  - `moderation-reports-source-assertions.ts`
  - `notifications-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.

## Commit

- `agentfeed-frontend` `bc8890a` — `Split discovery dashboard source assertions`

## 검증

- `npm run test:contracts -- src/lib/discovery-dashboard-source-contract.test.ts` 통과.
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
10 src/lib/discovery-dashboard-source-assertions.ts
30 src/lib/discovery-explore-source-assertions.ts
39 src/lib/dashboard-source-assertions.ts
32 src/lib/moderation-reports-source-assertions.ts
37 src/lib/notifications-source-assertions.ts
```

Current source assertion helper re-scan top:

```text
154 src/lib/settings-source-assertions.ts
131 src/lib/feed-source-assertions.ts
124 src/lib/worklog-card-source-assertions.ts
96 src/lib/auth-shell-source-assertions.ts
76 src/lib/cli-authorize-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Source assertion helper candidate `moderation-reports-source-assertions.ts` handled by [[Frontend Moderation Reports Source Assertion Helper Split 2026-06-25]].
- [x] Previous next candidate `discovery-dashboard-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `settings-source-assertions.ts` at 154 pure LOC.
- [ ] Keep `discovery-dashboard-source-assertions.ts` as thin orchestrator only.
- [ ] 5-commit threshold will be handled by push + current-server deploy after docs commits.
