---
title: Frontend Settings Profile Error Detail
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/error-handling
  - settings
status: done
related:
  - [[Frontend Settings Token Error Detail 2026-06-09]]
  - [[Frontend Profile Follow Error Detail 2026-06-09]]
---

# Frontend Settings Profile Error Detail 2026-06-09

> [!success] 완료
> Settings profile/username 저장 helper가 raw `Error.message`/`String(err)` 중심으로 실패를 반환하지 않고, API·네트워크·런타임 오류를 action-level copy와 함께 표시하도록 개선했다.

## 문제

`src/lib/settings-profile-save.ts`의 저장 실패 처리는 다음 형태였다.

```ts
return err instanceof Error ? err.message : String(err)
```

영향:

- profile update 전체 실패에는 action-level 복구 문구가 없었다.
- profile details 저장 후 username 변경만 실패하는 partial success에서도 English generic prefix와 raw formatting이 섞였다.
- 네트워크 실패가 브라우저 기본 문구로 보일 수 있어 사용자가 조치하기 어려웠다.

## 변경 사항

- `src/lib/settings-profile-save.ts`
  - `PROFILE_SAVE_FAILURE_COPY`, `USERNAME_CHANGE_FAILURE_COPY` 추가.
  - `settingsProfileFailureMessage(base, error)` helper 추가.
  - `ApiError`는 API display message를 보존.
  - `TypeError`는 네트워크 연결 확인 안내 표시.
  - 일반 `Error.message`는 최대 160자로 제한해 표시.
  - profile update 실패와 username partial failure 모두 action-level helper 결과를 반환.
- `src/lib/settings-profile-save.contract.test.ts`
  - profile update failure total-failure copy 검증 추가.
  - username transport failure partial-success + connectivity copy 검증 추가.
  - username conflict detail 보존 검증을 action-level copy와 함께 강화.
- `src/lib/page-source-contract.test.ts`
  - Settings profile helper가 API/네트워크 detail을 유지하고 raw `Error/String` fallback으로 회귀하지 않도록 source contract 보강.

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

- 실제 브라우저 E2E에서 profile update/username change fault injection까지는 이번 국소 변경 범위에서 수행하지 않았다.
- Settings의 integrations/setup-guide/settings save fetch 오류도 같은 action-level helper 체계로 추가 정리할 수 있지만, 이번 패스에서는 profile/username mutation helper를 우선했다.
