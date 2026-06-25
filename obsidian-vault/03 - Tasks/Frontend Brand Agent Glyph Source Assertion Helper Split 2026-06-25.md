---
title: Frontend Brand Agent Glyph Source Assertion Helper Split 2026-06-25
aliases:
  - Brand agent glyph source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Brand Agent Glyph Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/brand-agent-glyph-source-assertions.ts`가 26 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 brand agent glyph source-contract 문자열 검사를 agent data fallback, owned SVG component, badge/landing/metadata usage helpers로 분리했다.

## 변경

- `brand-agent-glyph-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `brand-agent-data-glyph-source-assertions.ts`
  - `brand-agent-glyph-component-source-assertions.ts`
  - `brand-agent-glyph-usage-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- Runtime/UI/API 동작 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 이 문서화 후 전체 unpushed counter가 6 commits가 되어 threshold push/deploy 대상이다.

## Commit

- `agentfeed-frontend` `9cbcd89` — `Split brand agent glyph source assertions`

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
 8 src/lib/brand-agent-glyph-source-assertions.ts
 8 src/lib/brand-agent-data-glyph-source-assertions.ts
14 src/lib/brand-agent-glyph-component-source-assertions.ts
10 src/lib/brand-agent-glyph-usage-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
26 src/lib/auth-shell-session-source-assertions.ts
25 src/lib/worklog-review-action-source-assertions.ts
25 src/lib/profile-page-a11y-source-assertions.ts
25 src/lib/cli-authorize-route-source-assertions.ts
25 src/lib/api-boundary-rank-notification-source-assertions.ts
22 src/lib/project-visibility-source-assertions.ts
21 src/lib/worklog-detail-mutation-source-assertions.ts
21 src/lib/worklog-card-navigation-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `brand-agent-glyph-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidate is `auth-shell-session-source-assertions.ts` at 26 pure LOC.
- [ ] Current unpushed commit counter reached 6; threshold push/deploy pending.
