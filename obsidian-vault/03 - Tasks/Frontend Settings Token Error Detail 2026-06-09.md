---
title: Frontend Settings Token Error Detail
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/error-handling
  - cli-token
status: done
related:
  - [[Frontend Worklog Mutation Error Detail 2026-06-09]]
  - [[Frontend Projects Create Error Detail 2026-06-09]]
---

# Frontend Settings Token Error Detail 2026-06-09

> [!success] 완료
> Settings page의 CLI ingestion token create/revoke/rotate 실패가 generic/raw 오류로 노출되지 않고, token section 안에서 API·네트워크·런타임 오류를 구분해 표시되도록 개선했다.

## 문제

`src/components/pages/SettingsPage.tsx`의 token lifecycle 실패 처리는 다음 한계가 있었다.

```ts
setTokensError(`Could not create ingestion token: ${formatError(err)}`)
setError(formatError(err)) // revoke / rotate
```

영향:

- create는 English generic prefix + raw formatting 중심이었다.
- revoke/rotate는 token section이 아니라 page-level error로 떨어져 CLI token row 맥락이 약해졌다.
- 네트워크 실패와 API validation/permission 실패를 분리해 안내하지 못했다.

## 변경 사항

- `src/components/pages/SettingsPage.tsx`
  - `TOKEN_CREATE_FAILURE_COPY`, `TOKEN_REVOKE_FAILURE_COPY`, `TOKEN_ROTATE_FAILURE_COPY` 추가.
  - `formatError(err)`가 `ApiError`, `TypeError`, 일반 `Error`, unknown을 구분하도록 보강.
  - `tokenActionFailureMessage(base, error)` helper 추가.
  - create/revoke/rotate 실패를 모두 `setTokensError(...)`로 token section에 표시.
  - 일반 `Error.message`는 최대 160자로 제한해 표시.
- `src/lib/page-source-contract.test.ts`
  - token lifecycle 실패가 action-level copy와 API/네트워크 detail을 유지하도록 source contract 보강.
  - create의 generic raw copy와 revoke/rotate의 page-level raw `setError(formatError(err))` 회귀를 금지.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- src/lib/page-source-contract.test.ts src/lib/api-contract.test.ts src/lib/settings-profile-save.contract.test.ts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- Frontend contract/source tests: 통과
- Frontend typecheck/lint: 통과
- Dev OpenAPI contract gate: 통과

## 서버/배포

> [!warning]
> active goal 규칙에 따라 서버 배포는 수행하지 않았다.

## 후행 과제

- 실제 브라우저 E2E에서 token create/revoke/rotate fault injection까지는 이번 국소 변경 범위에서 수행하지 않았다.
- Settings의 settings/profile/integration fetch 오류까지 동일한 action-level helper 체계로 더 정리할 수 있지만, 이번 패스에서는 CLI token lifecycle 경로를 우선했다.
