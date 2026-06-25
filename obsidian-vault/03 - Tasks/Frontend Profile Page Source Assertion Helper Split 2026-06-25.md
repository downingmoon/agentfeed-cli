---
title: Frontend Profile Page Source Assertion Helper Split 2026-06-25
aliases:
  - Profile page source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Profile Page Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/profile-page-source-assertions.ts`가 65 pure LOC로 다음 source assertion growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 profile page source-contract 문자열 검사를 data/loading, follow action, accessibility/tab/activity, project-card helper 4개로 분리했다.

## 변경

- `profile-page-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `profile-page-data-source-assertions.ts`
  - `profile-page-follow-source-assertions.ts`
  - `profile-page-a11y-source-assertions.ts`
  - `profile-page-project-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `6caba53` — `Split profile page source assertions`

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
10 src/lib/profile-page-source-assertions.ts
18 src/lib/profile-page-data-source-assertions.ts
17 src/lib/profile-page-follow-source-assertions.ts
25 src/lib/profile-page-a11y-source-assertions.ts
17 src/lib/profile-page-project-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
63 src/lib/project-detail-source-assertions.ts
54 src/lib/shell-source-assertions.ts
51 src/lib/api-boundary-worklog-source-assertions.ts
50 src/lib/worklog-review-page-source-assertions.ts
44 src/lib/project-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `profile-page-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `project-detail-source-assertions.ts` at 63 pure LOC.
- [ ] Keep `profile-page-source-assertions.ts` as thin orchestrator only.
- [ ] Current unpushed commit counter after this task docs: 6 commits; triggers 5-commit push/deploy threshold.
