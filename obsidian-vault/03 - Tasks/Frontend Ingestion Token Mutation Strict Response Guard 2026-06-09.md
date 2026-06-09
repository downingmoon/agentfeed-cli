---
title: Frontend Ingestion Token Mutation Strict Response Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - ingestion
  - settings
  - api-contract
  - fail-closed
status: done
related:
  - "[[CLI Ingestion Status Extra Field Guard 2026-06-09]]"
  - "[[Auth Social Explore Ingestion Strict Response Boundary 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Frontend Ingestion Token Mutation Strict Response Guard 2026-06-09

## 결론

Frontend Settings의 ingestion token list/create/rotate 응답 parser를 Backend ingestion token response schema와 같은 방향으로 fail-closed 처리했다. 이제 Settings API client는 token list item, created token, rotated token, rotated token user에 예상하지 않은 필드가 들어오면 `502` contract mismatch로 거부한다.

> [!important] Goal constraint
> Goal 필수 규칙 6에 따라 서버 배포는 실시하지 않았다.

## 근거

Backend 기준 계약은 `agentfeed-backend/app/schemas/ingestion.py`다.

- `IngestionTokenListItem`
  - `extra="forbid"`
  - 허용 필드: `id`, `name`, `last_used_at`, `created_at`, `expires_at`
- `IngestionTokenResponse`
  - `extra="forbid"`
  - 허용 필드: `id`, `name`, `token`, `created_at`, `expires_at`
- `RotatedIngestionTokenResponse`
  - `extra="forbid"`
  - 허용 필드: `id`, `name`, `token`, `created_at`, `expires_at`, `token_expires_at`, `rotated_from`, `rotated_at`, `user`
- `IngestionStatusUser`
  - `extra="forbid"`
  - 허용 필드: `id`, `username`, `display_name`, `avatar_url`

기존 Frontend normalizer는 필수 값과 날짜는 검증했지만, list/create/rotate token 응답의 extra field를 거부하지 않았다. 또한 rotated token의 `user`에 일반 public profile normalizer를 재사용해 Backend보다 넓은 public user field set을 허용할 수 있었다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiIngestionTokenUser` 추가.
  - `ApiRotatedIngestionToken.user`를 Settings token response 전용 최소 user shape로 변경.
  - token list item, created token, rotated token, rotated token user field set 상수 추가.
  - 각 normalizer에서 `rejectUnexpectedKeysForContract()` 적용.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - rotate positive fixture에 Backend shape의 `user` 추가.
  - list item extra field rejection 추가.
  - created token extra field rejection 추가.
  - rotated token root extra field rejection 추가.
  - rotated token user extra field rejection 추가.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
npm run lint
```

결과:

- Frontend contract tests 통과
- TypeScript `tsc --noEmit` 통과

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- AgentFeed OpenAPI contract gate passed
- `75` operations checked
- `70` client contracts checked
- `40` response field contracts checked

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build
```

결과:

- Next.js production build 통과
- `18` static pages generated

## 후행 과제

- Frontend ingestion token revoke empty/ok response도 Backend `OkResponse` 계약과 extra field 정책이 일치하는지 재검토한다.
- CLI와 Frontend에서 token mutation 계열 response field set이 Backend schema 변경 시 자동으로 감지되도록 Dev OpenAPI gate 확장을 검토한다.
- SettingsPage UI는 token rotation secret copy 중심으로 동작하므로 `user`를 화면에 노출하지 않는다. 향후 노출 필요 시 신규 기능으로 문서화 후 별도 진행한다.
