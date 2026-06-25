---
title: Frontend Settings Source Assertion Helper Split 2026-06-25
aliases:
  - Settings source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Settings Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/settings-source-assertions.ts`가 154 pure LOC로 다음 source assertion growth-risk helper였다. Runtime 동작은 바꾸지 않고 Settings shell/load, token lifecycle, profile save, preferences, auth recovery source-contract 문자열 검사를 domain helper 5개로 분리했다.

## 변경

- `settings-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `settings-shell-source-assertions.ts`
  - `settings-token-source-assertions.ts`
  - `settings-profile-source-assertions.ts`
  - `settings-preferences-source-assertions.ts`
  - `settings-auth-recovery-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `00f382f` — `Split settings source assertions`

## 검증

- `npm run test:contracts -- src/lib/settings-source-contract.test.ts` 통과.
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
12 src/lib/settings-source-assertions.ts
32 src/lib/settings-shell-source-assertions.ts
33 src/lib/settings-token-source-assertions.ts
31 src/lib/settings-profile-source-assertions.ts
19 src/lib/settings-preferences-source-assertions.ts
20 src/lib/settings-auth-recovery-source-assertions.ts
```

Current source assertion helper re-scan top:

```text
131 src/lib/feed-source-assertions.ts
124 src/lib/worklog-card-source-assertions.ts
96 src/lib/auth-shell-source-assertions.ts
76 src/lib/cli-authorize-source-assertions.ts
67 src/lib/auth-next-contract-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `settings-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `feed-source-assertions.ts` at 131 pure LOC.
- [ ] Keep `settings-source-assertions.ts` as thin orchestrator only.
- [ ] Current unpushed commit counter after this task docs: 3 commits; below 5-commit push/deploy threshold.
