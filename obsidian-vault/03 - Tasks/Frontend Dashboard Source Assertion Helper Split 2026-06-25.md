---
title: Frontend Dashboard Source Assertion Helper Split 2026-06-25
aliases:
  - Dashboard source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Dashboard Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/dashboard-source-assertions.ts`가 39 pure LOC로 다음 source assertion growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 dashboard source-contract 문자열 검사를 shell/avatar, data isolation, saved worklog, recovery/loading helper 4개로 분리했다.

## 변경

- `dashboard-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `dashboard-shell-source-assertions.ts`
  - `dashboard-data-source-assertions.ts`
  - `dashboard-saved-worklog-source-assertions.ts`
  - `dashboard-recovery-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `bf5b97b` — `Split dashboard source assertions`

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
10 src/lib/dashboard-source-assertions.ts
11 src/lib/dashboard-shell-source-assertions.ts
12 src/lib/dashboard-data-source-assertions.ts
12 src/lib/dashboard-saved-worklog-source-assertions.ts
16 src/lib/dashboard-recovery-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
37 src/lib/worklog-card-list-source-assertions.ts
37 src/lib/notifications-source-assertions.ts
37 src/lib/landing-preview-source-assertions.ts
33 src/lib/settings-token-source-assertions.ts
33 src/lib/api-boundary-visibility-integration-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `dashboard-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidates: `worklog-card-list-source-assertions.ts`, `notifications-source-assertions.ts`, `landing-preview-source-assertions.ts` at 37 pure LOC.
- [ ] Keep `dashboard-source-assertions.ts` as thin orchestrator only.
- [x] 6-commit push/deploy threshold handled in [[Personal Server Deploy Local Refresh 2026-06-25#2026-06-25 — Post review-public-user-assets/dashboard source assertion splits threshold deploy]].
