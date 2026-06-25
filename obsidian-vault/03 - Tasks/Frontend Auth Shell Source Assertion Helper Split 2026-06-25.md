---
title: Frontend Auth Shell Source Assertion Helper Split 2026-06-25
aliases:
  - Auth shell source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Auth Shell Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/auth-shell-source-assertions.ts`가 96 pure LOC로 다음 source assertion growth-risk helper였다. Runtime 동작은 바꾸지 않고 auth identity/review preview, auth-scoped social cleanup, session recovery/probing, sign-out failure handling, worklog review auth recovery, auth/header/feed accessibility source-contract 문자열 검사를 domain helper 6개로 분리했다.

## 변경

- `auth-shell-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `auth-shell-identity-source-assertions.ts`
  - `auth-shell-social-source-assertions.ts`
  - `auth-shell-session-source-assertions.ts`
  - `auth-shell-signout-source-assertions.ts`
  - `auth-shell-review-recovery-source-assertions.ts`
  - `auth-shell-a11y-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 문서 commit 후 5-commit threshold 초과라 push/deploy 대상이다.

## Commit

- `agentfeed-frontend` `f57aaec` — `Split auth shell source assertions`

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
14 src/lib/auth-shell-source-assertions.ts
17 src/lib/auth-shell-identity-source-assertions.ts
21 src/lib/auth-shell-social-source-assertions.ts
26 src/lib/auth-shell-session-source-assertions.ts
16 src/lib/auth-shell-signout-source-assertions.ts
17 src/lib/auth-shell-review-recovery-source-assertions.ts
21 src/lib/auth-shell-a11y-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
76 src/lib/cli-authorize-source-assertions.ts
67 src/lib/api-boundary-enum-source-assertions.ts
66 src/lib/brand-assets-source-assertions.ts
65 src/lib/profile-page-source-assertions.ts
63 src/lib/project-detail-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `auth-shell-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `cli-authorize-source-assertions.ts` at 76 pure LOC.
- [ ] Keep `auth-shell-source-assertions.ts` as thin orchestrator only.
- [ ] Current unpushed commit counter after this task docs: 6 commits; triggers 5-commit push/deploy threshold.
