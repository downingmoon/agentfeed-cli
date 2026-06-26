---
title: Frontend Project Detail Data Source Assertion Helper Split 2026-06-25
aliases:
  - Project detail data source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Project Detail Data Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/project-detail-data-source-assertions.ts`가 16 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 project detail data source-contract 검사를 data loading, worklog data, identity/stats helpers로 분리했다.

## 변경

- `project-detail-data-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `project-detail-data-loading-source-assertions.ts`
  - `project-detail-worklog-data-source-assertions.ts`
  - `project-detail-identity-stats-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- Runtime/UI/API 동작 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 현재 서버 canonical name: `trading-bot`. 현재 Codex는 이 서버 위에서 실행 중이므로 배포 시 SSH hop 없이 로컬 rsync 사용.
- 이 문서화 후 unpushed counter는 3 commits라 5-commit threshold 미만이다. Push/deploy 없음.

## Commit

- `agentfeed-frontend` `be7da0e` — `Split project detail data assertions`

## 검증

- Pre-edit regression: `npm run test:contracts -- src/lib/project-source-contract.test.ts src/lib/public-profile-source-contract.test.ts` 통과.
- Post-edit targeted contract: `npm run test:contracts -- src/lib/public-profile-source-contract.test.ts` 통과.
- `npm run test:contracts` 통과.
- `npm run lint` 통과. (`tsc --noEmit`)
- `npx tsc --noEmit` 통과.
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` 통과. Next.js 18 static pages generated. 기존 multi-lockfile workspace-root warning만 발생.
- Changed-file no-excuse grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, eslint-disable, TODO/FIXME 없음.
- Changed-file LOC audit 통과.
- `git diff --check` 통과.
- LSP diagnostics는 기존처럼 `Transport closed`; `tsc --noEmit`, contract tests, build로 대체 검증.
- Visual QA 미실행: runtime/UI 변경 없는 source-contract helper refactor.

## Size audit

```text
8 src/lib/project-detail-data-source-assertions.ts
8 src/lib/project-detail-data-loading-source-assertions.ts
7 src/lib/project-detail-worklog-data-source-assertions.ts
9 src/lib/project-detail-identity-stats-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
16 src/lib/notifications-action-source-assertions.ts
16 src/lib/moderation-rendering-source-assertions.ts
16 src/lib/landing-preview-interaction-source-assertions.ts
16 src/lib/landing-preview-data-source-assertions.ts
16 src/lib/feed-hook-retry-source-assertions.ts
16 src/lib/dashboard-recovery-source-assertions.ts
16 src/lib/cli-authorize-approval-source-assertions.ts
16 src/lib/auth-shell-signout-source-assertions.ts
15 src/lib/shell-static-page-source-assertions.ts
15 src/lib/settings-load-save-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `project-detail-data-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `notifications-action-source-assertions.ts` handled by [[Frontend Notifications Action Source Assertion Helper Split 2026-06-25]].
- [ ] Next source assertion helper candidates: `moderation-rendering-source-assertions.ts`, `landing-preview-interaction-source-assertions.ts`, `landing-preview-data-source-assertions.ts` at 16 pure LOC.
- [x] Subsequent notifications-action docs brought unpushed counter to 6 commits; threshold push/deploy completed. See [[Personal Server Deploy Local Refresh 2026-06-25#2026-06-25 — Post project-detail-data/notifications-action source assertion splits threshold deploy]].
