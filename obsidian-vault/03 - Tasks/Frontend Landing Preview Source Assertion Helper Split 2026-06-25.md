---
title: Frontend Landing Preview Source Assertion Helper Split 2026-06-25
aliases:
  - Landing preview source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Landing Preview Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/landing-preview-source-assertions.ts`가 37 pure LOC growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 landing preview source-contract 문자열 검사를 static data/API preview, interaction/social/share, rendering/delegation/outcome helper 3개로 분리했다.

## 변경

- `landing-preview-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `landing-preview-data-source-assertions.ts`
  - `landing-preview-interaction-source-assertions.ts`
  - `landing-preview-rendering-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `8b4d89e` — `Split landing preview source assertions`

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
8 src/lib/landing-preview-source-assertions.ts
16 src/lib/landing-preview-data-source-assertions.ts
16 src/lib/landing-preview-interaction-source-assertions.ts
14 src/lib/landing-preview-rendering-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `landing-preview-source-assertions.ts` split 처리.
- [x] Same-batch candidate `settings-token-source-assertions.ts` split 처리. See [[Frontend Settings Token Source Assertion Helper Split 2026-06-25]].
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `api-boundary-visibility-integration-source-assertions.ts` at 33 pure LOC.
- [ ] Keep `landing-preview-source-assertions.ts` as thin orchestrator only.
