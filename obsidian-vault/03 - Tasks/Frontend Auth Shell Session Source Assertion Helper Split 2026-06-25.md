---
title: Frontend Auth Shell Session Source Assertion Helper Split 2026-06-25
aliases:
  - Auth shell session source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Auth Shell Session Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/auth-shell-session-source-assertions.ts`가 26 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 auth shell session source-contract 문자열 검사를 fail-closed cleanup, session-expired recovery, auth.me probe/retry helpers로 분리했다.

## 변경

- `auth-shell-session-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `auth-shell-session-cleanup-source-assertions.ts`
  - `auth-shell-session-expiry-source-assertions.ts`
  - `auth-shell-session-probe-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- Runtime/UI/API 동작 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음. 이 문서화 후 unpushed counter는 3 commits라 5-commit threshold 미만.

## Commit

- `agentfeed-frontend` `64a8c35` — `Split auth shell session source assertions`

## 검증

- `npm run test:contracts -- src/lib/auth-shell-source-contract.test.ts` 통과.
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
 8 src/lib/auth-shell-session-source-assertions.ts
 9 src/lib/auth-shell-session-cleanup-source-assertions.ts
14 src/lib/auth-shell-session-expiry-source-assertions.ts
12 src/lib/auth-shell-session-probe-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
25 src/lib/worklog-review-action-source-assertions.ts
25 src/lib/profile-page-a11y-source-assertions.ts
25 src/lib/cli-authorize-route-source-assertions.ts
25 src/lib/api-boundary-rank-notification-source-assertions.ts
22 src/lib/project-visibility-source-assertions.ts
21 src/lib/worklog-detail-mutation-source-assertions.ts
21 src/lib/worklog-card-navigation-source-assertions.ts
21 src/lib/feed-follow-action-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `auth-shell-session-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidates are `worklog-review-action-source-assertions.ts`, `profile-page-a11y-source-assertions.ts`, `cli-authorize-route-source-assertions.ts`, `api-boundary-rank-notification-source-assertions.ts` at 25 pure LOC.
- [ ] Current unpushed commit counter after this task docs: 3 commits; below 5-commit push/deploy threshold.
