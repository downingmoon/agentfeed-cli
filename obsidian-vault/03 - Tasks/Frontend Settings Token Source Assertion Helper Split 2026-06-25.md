---
title: Frontend Settings Token Source Assertion Helper Split 2026-06-25
aliases:
  - Settings token source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Settings Token Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/settings-token-source-assertions.ts`가 33 pure LOC growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 settings token source-contract 문자열 검사를 token error, one-time secret UI, token action confirmation helper 3개로 분리했다.

## 변경

- `settings-token-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `settings-token-error-source-assertions.ts`
  - `settings-token-secret-source-assertions.ts`
  - `settings-token-action-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `71ebf27` — `Split settings token source assertions`

## 검증

- `npm run test:contracts -- src/lib/landing-preview-source-contract.test.ts src/lib/settings-source-contract.test.ts` 통과.
- `npm run test:contracts` 통과.
- `npm run lint` 통과. (`tsc --noEmit`)
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` 통과. Next.js 18 static pages generated. 기존 multi-lockfile workspace-root warning만 발생.
- Changed-file no-excuse grep 통과.
- Changed-file LOC audit 통과.
- `git diff --check` 통과.
- LSP diagnostics는 기존처럼 `Transport closed`; `tsc --noEmit`, contract tests, build로 대체 검증.
- Visual QA 미실행: runtime/UI 변경 없는 source-contract helper refactor.

## Size audit

```text
8 src/lib/settings-token-source-assertions.ts
17 src/lib/settings-token-error-source-assertions.ts
12 src/lib/settings-token-secret-source-assertions.ts
12 src/lib/settings-token-action-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
33 src/lib/api-boundary-visibility-integration-source-assertions.ts
32 src/lib/worklog-detail-accessibility-source-assertions.ts
32 src/lib/settings-shell-source-assertions.ts
32 src/lib/moderation-reports-source-assertions.ts
32 src/lib/api-boundary-project-dashboard-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `settings-token-source-assertions.ts` split 처리.
- [x] Same-batch candidate `landing-preview-source-assertions.ts` split 처리. See [[Frontend Landing Preview Source Assertion Helper Split 2026-06-25]].
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [ ] Keep `settings-token-source-assertions.ts` as thin orchestrator only.
- [ ] Current unpushed commit counter after this task docs: 5 commits; triggers 5-commit push/deploy threshold.
