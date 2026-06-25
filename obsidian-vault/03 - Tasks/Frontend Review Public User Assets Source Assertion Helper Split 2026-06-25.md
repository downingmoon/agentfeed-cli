---
title: Frontend Review Public User Assets Source Assertion Helper Split 2026-06-25
aliases:
  - Review public user assets source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Review Public User Assets Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/review-public-user-assets-source-assertions.ts`가 40 pure LOC로 다음 source assertion growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 review/public user/assets source-contract 문자열 검사를 asset metadata, public user contract/display, avatar component helper 3개로 분리했다.

## 변경

- `review-public-user-assets-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `review-public-asset-metadata-source-assertions.ts`
  - `review-public-user-contract-source-assertions.ts`
  - `review-public-avatar-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `6ee062c` — `Split review public user asset source assertions`

## 검증

- `npm run test:contracts -- src/lib/worklog-review-assets-source-contract.test.ts` 통과.
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
8 src/lib/review-public-user-assets-source-assertions.ts
18 src/lib/review-public-asset-metadata-source-assertions.ts
15 src/lib/review-public-user-contract-source-assertions.ts
13 src/lib/review-public-avatar-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
39 src/lib/dashboard-source-assertions.ts
37 src/lib/worklog-card-list-source-assertions.ts
37 src/lib/notifications-source-assertions.ts
37 src/lib/landing-preview-source-assertions.ts
33 src/lib/settings-token-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `review-public-user-assets-source-assertions.ts` split 처리.
- [x] Continue source assertion helper re-scan candidate `dashboard-source-assertions.ts` 처리 완료. See [[Frontend Dashboard Source Assertion Helper Split 2026-06-25]].
- [ ] Keep `review-public-user-assets-source-assertions.ts` as thin orchestrator only.
- [ ] Current next source assertion helper candidates after dashboard split: `worklog-card-list-source-assertions.ts`, `notifications-source-assertions.ts`, `landing-preview-source-assertions.ts` at 37 pure LOC.
