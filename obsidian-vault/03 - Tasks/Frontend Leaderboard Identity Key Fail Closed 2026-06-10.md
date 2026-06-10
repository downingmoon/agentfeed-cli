---
title: Frontend Leaderboard Identity Key Fail Closed 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - contract
  - fail-closed
status: done
related:
  - "[[Backend Feed Query Filter Fail Closed 2026-06-10]]"
  - "[[CLI Package Version Fail Closed 2026-06-10]]"
---

# Frontend Leaderboard Identity Key Fail Closed 2026-06-10

## 배경

Leaderboard 렌더링 키는 Backend가 내려주는 사용자 식별자(`id` 또는 `username`)를 기준으로 해야 한다. 기존 `leaderboardUserKey`는 두 값이 모두 비어 있을 때도 `'unknown-user'`로 조용히 fallback 했다.

> [!bug] 문제
> malformed row가 직접 전달되면 여러 사용자가 같은 `unknown-user` 키로 합쳐질 수 있고, 실제 contract drift가 사용자에게 명확한 오류로 드러나지 않는다.

## 수정 내용

- `src/lib/leaderboard-user-key.contract.test.ts` 추가
  - `id: ''`, `username: null`인 malformed `ApiLeaderboardItem`이 조용히 `unknown-user`가 되지 않고 오류를 던지는지 검증.
- `scripts/run-contract-tests.mjs`에 신규 contract test 편입.
- `src/lib/leaderboard-adapter.ts`
  - `id.trim()` 우선 사용.
  - `username?.trim()` 보조 사용.
  - 둘 다 없으면 `Leaderboard API returned malformed ranking rows: user identity is missing`로 fail-closed.

## 검증

- Red: `npm run test:contracts`
  - 실패 사유: `leaderboardUserKey must fail closed instead of collapsing malformed rows into unknown-user`
- Green: `npm run test:contracts`
  - 통과.
- Typecheck: `npm run lint`
  - 통과.
- Build: `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`
  - 통과.
- LOC
  - `src/lib/leaderboard-adapter.ts`: 149 pure LOC
  - `src/lib/leaderboard-user-key.contract.test.ts`: 40 pure LOC
  - `scripts/run-contract-tests.mjs`: 81 pure LOC
- LSP
  - `typescript-language-server`가 로컬에 설치되어 있지 않아 MCP LSP diagnostics는 실행 불가.
  - 대신 `tsc --noEmit` 기반 `npm run lint`로 타입 검증 완료.

## 후행 과제

> [!todo]
> Leaderboard UI가 Backend의 모든 ranking type을 의도적으로 일부만 노출하는지, 아니면 누락인지 제품 관점에서 별도 확인이 필요하다. 신규 기능 추가는 금지 상태이므로 현재 작업에서는 문서화만 한다.

> [!todo]
> `src/lib/api-contract.test.ts`는 5,000 pure LOC 이상인 레거시 대형 contract 파일이다. 이번 작업은 새 test file로 분리했지만, 향후 contract cluster별 분할 작업이 필요하다.
