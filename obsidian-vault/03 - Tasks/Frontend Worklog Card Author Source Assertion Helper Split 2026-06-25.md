---
title: Frontend Worklog Card Author Source Assertion Helper Split 2026-06-25
aliases:
  - Worklog card author source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Worklog Card Author Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/worklog-card-author-source-assertions.ts`가 19 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 worklog card author source-contract 검사를 hydrated author resolution, adapter/avatar boundary, project fallback helpers로 분리했다.

## 변경

- `worklog-card-author-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `worklog-card-author-resolution-source-assertions.ts`
  - `worklog-card-author-adapter-source-assertions.ts`
  - `worklog-card-project-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- Runtime/UI/API 동작 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 현재 서버 canonical name: `trading-bot`. 현재 Codex는 이 서버 위에서 실행 중이므로 배포 시 SSH hop 없이 로컬 rsync 사용.
- 이 문서화 후 unpushed counter는 3 commits라 5-commit threshold 미만이다.

## Commit

- `agentfeed-frontend` `4f7e98b` — `Split worklog card author source assertions`

## 검증

- Pre-edit regression: `npm run test:contracts -- src/lib/worklog-card-source-contract.test.ts` 통과.
- Post-edit targeted contract: `npm run test:contracts -- src/lib/worklog-card-source-contract.test.ts` 통과.
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
 8 src/lib/worklog-card-author-source-assertions.ts
12 src/lib/worklog-card-author-resolution-source-assertions.ts
 8 src/lib/worklog-card-author-adapter-source-assertions.ts
 6 src/lib/worklog-card-project-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
19 src/lib/settings-preferences-source-assertions.ts
19 src/lib/project-visibility-source-assertions.ts
19 src/lib/cli-authorize-terminal-a11y-source-assertions.ts
19 src/lib/adapters-source-assertions.ts
18 src/lib/review-public-asset-metadata-source-assertions.ts
18 src/lib/profile-page-data-source-assertions.ts
18 src/lib/leaderboard-source-assertions.ts
17 src/lib/worklog-detail-profile-source-assertions.ts
17 src/lib/settings-token-error-source-assertions.ts
17 src/lib/project-create-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `worklog-card-author-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidates: `settings-preferences-source-assertions.ts`, `project-visibility-source-assertions.ts`, `cli-authorize-terminal-a11y-source-assertions.ts`, `adapters-source-assertions.ts` at 19 pure LOC.
- [ ] Current unpushed commit counter after this task docs: 3 commits; below 5-commit threshold, no push/deploy.
