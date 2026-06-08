---
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - cli-auth
  - api-contract
  - hardening
---

# CLI Auth Approval Response Guard 2026-06-08

## 결론

`agentfeed login` 브라우저 승인 화면에서 사용하는 Frontend `cliAuth.session` / `cliAuth.approve` 응답을 runtime guard로 보강했다. CLI 자체는 이미 `parseCliAuthSession` / `parseCliAuthExchangeResult`로 응답을 검증하고 있었지만, Frontend approval screen은 typed `apiFetch` 결과를 그대로 신뢰하고 있었다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeCliAuthSession` 추가.
  - `normalizeCliAuthApproveResult` 추가.
  - session 응답의 `session_id`, `status`, `created_at`, `expires_at`, optional approval/consumption dates, `user_code_required`, `poll_interval_seconds` 검증.
  - approval 응답은 Backend의 실제 계약대로 `ok === true` 및 `status === "approved"`만 허용.
- `agentfeed-frontend/src/lib/cli-auth.contract.ts`
  - malformed session status/date/poll interval rejection 추가.
  - malformed approve `ok`/`status` rejection 추가.
  - 실패 시 `ApiError(502)`와 `CLI auth response contract mismatch` diagnostic을 요구.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/cli-auth.contract.ts src/lib/api.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- 단독 CLI auth contract typecheck 통과.
- Frontend contract suite 통과.
- Frontend `tsc --noEmit` 통과.
- Dev OpenAPI contract gate 통과.

## 후행 과제

- 다음 audit 후보는 read/list 계열 payload render boundary다.
  - `worklogs.get/review`
  - `moderation.listReports`
  - `search.query`
  - `explore.get`
  - `users.activity`
- CLI browser-login E2E는 이미 CLI parser와 hosted smoke에서 일부 검증되지만, authenticated browser approval full E2E는 별도 세션에서 수행해야 한다.
