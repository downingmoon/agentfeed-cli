---
title: Frontend API Boundary Enum Source Assertion Helper Split 2026-06-25
aliases:
  - API boundary enum source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend API Boundary Enum Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/api-boundary-enum-source-assertions.ts`가 67 pure LOC로 다음 source assertion growth-risk helper였다. Runtime 동작은 바꾸지 않고 enum primitive/visibility/integration, leaderboard/notification/username, privacy scan source-contract 문자열 검사를 domain helper 3개로 분리했다.

## 변경

- `api-boundary-enum-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `api-boundary-visibility-integration-source-assertions.ts`
  - `api-boundary-rank-notification-source-assertions.ts`
  - `api-boundary-privacy-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 문서 commit 후 5-commit threshold 초과라 push/deploy 대상이다.

## Commit

- `agentfeed-frontend` `fdfaeef` — `Split API boundary enum source assertions`

## 검증

- `npm run test:contracts -- src/lib/api-boundary-source-contract.test.ts` 통과.
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
8 src/lib/api-boundary-enum-source-assertions.ts
33 src/lib/api-boundary-visibility-integration-source-assertions.ts
25 src/lib/api-boundary-rank-notification-source-assertions.ts
17 src/lib/api-boundary-privacy-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
66 src/lib/brand-assets-source-assertions.ts
65 src/lib/profile-page-source-assertions.ts
63 src/lib/project-detail-source-assertions.ts
54 src/lib/shell-source-assertions.ts
51 src/lib/api-boundary-worklog-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `api-boundary-enum-source-assertions.ts` split 처리.
- [x] Continue source assertion helper re-scan candidate `brand-assets-source-assertions.ts` 처리 완료. See [[Frontend Brand Assets Source Assertion Helper Split 2026-06-25]].
- [ ] Keep `api-boundary-enum-source-assertions.ts` as thin orchestrator only.
- [ ] Current next source assertion helper candidate after brand-assets split: `profile-page-source-assertions.ts` at 65 pure LOC.
- [x] 6-commit push/deploy threshold handled in [[Personal Server Deploy Local Refresh 2026-06-25#2026-06-25 — Post CLI-authorize/API-boundary-enum source assertion splits threshold deploy]].
