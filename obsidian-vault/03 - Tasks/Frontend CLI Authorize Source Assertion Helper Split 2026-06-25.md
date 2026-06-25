---
title: Frontend CLI Authorize Source Assertion Helper Split 2026-06-25
aliases:
  - CLI authorize source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend CLI Authorize Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/cli-authorize-source-assertions.ts`가 76 pure LOC로 다음 source assertion growth-risk helper였다. Runtime 동작은 바꾸지 않고 CLI authorize route/sessionStorage, auth.me/browser marker probing, approval/account UI, polling/transient retry, terminal cleanup/accessibility source-contract 문자열 검사를 domain helper 5개로 분리했다.

## 변경

- `cli-authorize-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `cli-authorize-route-source-assertions.ts`
  - `cli-authorize-auth-source-assertions.ts`
  - `cli-authorize-approval-source-assertions.ts`
  - `cli-authorize-retry-source-assertions.ts`
  - `cli-authorize-terminal-a11y-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `d102021` — `Split CLI authorize source assertions`

## 검증

- `npm run test:contracts -- src/lib/cli-authorize-source-contract.test.ts` 통과.
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
12 src/lib/cli-authorize-source-assertions.ts
25 src/lib/cli-authorize-route-source-assertions.ts
10 src/lib/cli-authorize-auth-source-assertions.ts
16 src/lib/cli-authorize-approval-source-assertions.ts
20 src/lib/cli-authorize-retry-source-assertions.ts
19 src/lib/cli-authorize-terminal-a11y-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
67 src/lib/api-boundary-enum-source-assertions.ts
66 src/lib/brand-assets-source-assertions.ts
65 src/lib/profile-page-source-assertions.ts
63 src/lib/project-detail-source-assertions.ts
54 src/lib/shell-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `cli-authorize-source-assertions.ts` split 처리.
- [x] Continue source assertion helper re-scan candidate `api-boundary-enum-source-assertions.ts` 처리 완료. See [[Frontend API Boundary Enum Source Assertion Helper Split 2026-06-25]].
- [ ] Keep `cli-authorize-source-assertions.ts` as thin orchestrator only.
- [ ] Current next source assertion helper candidate after API boundary enum split: `brand-assets-source-assertions.ts` at 66 pure LOC.
- [ ] Current unpushed commit counter after API boundary enum task docs: 6 commits; triggers 5-commit push/deploy threshold.
