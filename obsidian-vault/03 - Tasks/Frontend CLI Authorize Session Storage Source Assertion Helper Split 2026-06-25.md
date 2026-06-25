---
title: Frontend CLI Authorize Session Storage Source Assertion Helper Split 2026-06-25
aliases:
  - CLI authorize session storage source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend CLI Authorize Session Storage Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/cli-authorize-session-storage-source-assertions.ts`가 22 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 CLI authorize session storage source-contract 검사를 stored session metadata/recovery, visible URL cleanup, partial incoming session fail-closed helpers로 분리했다.

## 변경

- `cli-authorize-session-storage-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `cli-authorize-stored-session-source-assertions.ts`
  - `cli-authorize-visible-url-source-assertions.ts`
  - `cli-authorize-incoming-session-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- Runtime/UI/API 동작 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음. 이 문서화 후 unpushed counter는 3 commits라 5-commit threshold 미만.

## Commit

- `agentfeed-frontend` `eed2809` — `Split CLI authorize session storage assertions`

## 검증

- Pre-edit regression: `npm run test:contracts -- src/lib/cli-authorize-source-contract.test.ts` 통과.
- Post-edit targeted contract: `npm run test:contracts -- src/lib/cli-authorize-source-contract.test.ts` 통과.
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
 8 src/lib/cli-authorize-session-storage-source-assertions.ts
14 src/lib/cli-authorize-stored-session-source-assertions.ts
 6 src/lib/cli-authorize-visible-url-source-assertions.ts
10 src/lib/cli-authorize-incoming-session-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
21 src/lib/worklog-detail-mutation-source-assertions.ts
21 src/lib/worklog-card-navigation-source-assertions.ts
21 src/lib/feed-follow-action-source-assertions.ts
21 src/lib/auth-shell-social-source-assertions.ts
21 src/lib/auth-shell-a11y-source-assertions.ts
20 src/lib/shell-ci-source-assertions.ts
20 src/lib/settings-auth-recovery-source-assertions.ts
20 src/lib/feed-sidebar-source-assertions.ts
20 src/lib/cli-authorize-retry-source-assertions.ts
20 src/lib/api-boundary-worklog-status-action-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `cli-authorize-session-storage-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `worklog-detail-mutation-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidates are `worklog-card-navigation-source-assertions.ts`, `feed-follow-action-source-assertions.ts`, `auth-shell-social-source-assertions.ts`, `auth-shell-a11y-source-assertions.ts` at 21 pure LOC.
- [x] Current unpushed commit counter after following worklog detail mutation docs reached 6; threshold push/deploy pending.
