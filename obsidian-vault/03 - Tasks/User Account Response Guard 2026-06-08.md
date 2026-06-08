---
title: User Account Response Guard 2026-06-08
aliases:
  - User Account Contract Guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/evidence
---

# User Account Response Guard 2026-06-08

> [!success] 결과
> Frontend가 `auth.me`, `users.get`, `users.checkUsername` 성공 응답을 더 이상 fallback으로 조용히 보정하지 않고, malformed successful payload를 `502 ApiError` contract diagnostic으로 fail-closed 처리하도록 보강했다.

## 변경 범위

- [[Frontend Request Strict Contract 2026-06-08]] 후속 hardening으로 user/account boundary를 보강했다.
- `auth.me`
  - `id`, `display_name`, `created_at`, `updated_at`을 필수 계약으로 검증한다.
  - username-only identity, blank id, non-date timestamp fallback을 제거했다.
  - nullable profile fields와 timezone은 문자열/null만 허용하고 공백 문자열은 `null`로 정규화한다.
- `users.get`
  - public user payload를 object로 검증한다.
  - `stats` 숫자 필드는 non-negative integer/null 계약을 적용한다.
  - public metric이 `null`이면 raw aggregate fallback보다 public privacy contract를 우선한다.
  - `viewer_state.following`은 boolean만 허용한다.
- `users.checkUsername`
  - `username` non-empty string, `available` boolean, optional `reason` string/null 계약을 추가했다.
- leaderboard user stats도 같은 user stat validator를 사용하되 오류는 leaderboard contract diagnostic으로 유지했다.

## 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/api.ts src/lib/api-contract.test.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- `npm run test:contracts`: 통과.
- `npm run lint`: 통과.
- OpenAPI contract gate: 75 operations, 70 client contracts, 40 response field contracts, 232 request body fields, 175 schema fields 통과.

## 후행 과제

- [ ] comment list/action response boundary와 remaining social payload도 같은 기준으로 계속 fail-closed audit한다.
- [ ] 개인 서버 배포 후 실제 IP-only environment에서 auth/profile/feed smoke를 재확인한다.

## 관련

- [[Active Tasks]]
- [[Frontend Request Strict Contract 2026-06-08]]
- [[Project Leaderboard Integration Guard 2026-06-08]]
