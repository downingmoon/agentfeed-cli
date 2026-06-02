---
title: Commercial Readiness Hardening - Frontend Settings Profile Partial Save 2026-06-02
aliases:
  - Frontend settings profile partial save
  - Settings username partial failure recovery
  - Profile and username two-step save recovery
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/reliability
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - Frontend Settings Profile Partial Save 2026-06-02

> [!success] 목표
> Settings의 profile 저장과 username 변경이 서로 다른 Backend mutation인 상황에서, profile field 저장이 성공하고 username 변경만 실패해도 사용자가 이미 저장된 변경을 잃거나 stale local state를 보지 않도록 합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P2 후보]]
- 통합 영역: [[Integration - CLI Backend Frontend#2026-06-02 Frontend settings profile partial-save recovery]]
- 변경 커밋: `agentfeed-frontend` `ea216a7 Preserve profile edits when username save fails`

## 발견한 gap

기존 `SettingsPage.saveProfile()`는 다음을 하나의 `try/catch`로 처리했습니다.

1. `PATCH /me/profile`
2. username이 바뀐 경우 `POST /me/username`
3. 둘 다 성공하면 AppContext와 form state 갱신

이 구조에서는 `PATCH /me/profile`이 성공했는데 username conflict/rate-limit/API failure로 `POST /me/username`만 실패하면 catch로 빠지면서 이미 저장된 display name/bio/location/link 변경이 local AppContext와 form에 반영되지 않았습니다. Backend 상태와 Frontend 상태가 어긋나고, 사용자는 어떤 field가 저장됐는지 알기 어렵습니다.

## 변경 범위

- `agentfeed-frontend/src/lib/settings-profile-save.ts`
  - profile form normalization과 request body 변환을 React component 밖으로 분리했습니다.
  - `saveSettingsProfile()`이 validation, profile mutation, username mutation, partial success result를 명시적으로 반환합니다.
  - profile 저장 성공 + username 실패 시 `status: 'partial'`을 반환하고 saved profile patch를 보존합니다.
- `agentfeed-frontend/src/components/pages/SettingsPage.tsx`
  - `saveSettingsProfile()` 결과로 `updateCurrentUser(result.userPatch)`와 `setProfile(result.profile)`을 수행합니다.
  - partial 상태에서는 성공 메시지와 username 실패 에러를 동시에 표시합니다.
  - username field는 실패한 requested username이 아니라 committed username으로 rollback됩니다.
- `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts`
  - profile 성공 + username 실패 partial contract를 고정했습니다.
  - 성공한 username 변경의 normalized handle 반영을 고정했습니다.
  - validation failure가 API를 호출하지 않는 계약을 고정했습니다.

## 고정된 계약

- `display_name`이 비어 있으면 API 호출 없이 validation error를 반환합니다.
- `username`이 비어 있으면 API 호출 없이 validation error를 반환합니다.
- profile mutation 실패는 total failure이며 local user/profile patch를 적용하지 않습니다.
- profile mutation 성공 후 username mutation 실패는 partial success입니다.
- partial success에서도 saved profile fields는 AppContext와 form에 반영됩니다.
- partial success에서 username은 현재 committed username으로 rollback됩니다.
- 사용자 copy는 “profile details saved”와 “username change failed”를 동시에 전달합니다.

## 검증 증거

- RED: `npm run test:contracts`
  - 실패 원인: `Cannot find module './settings-profile-save'`.
- GREEN: `npm run test:contracts`
  - Settings profile save helper contract 통과.
- GREEN: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run ci`
  - Typecheck passed.
  - Contract tests passed.
  - Production build passed.
- GREEN: `../agentfeed-dev ./scripts/test-all.sh`
  - OpenAPI contract gate passed: 70 operations, CLI 6 contracts, frontend 61 contracts.
  - CLI: 323 tests passed, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff passed, 285 pytest passed, alembic offline migration chain generated through `019_audit_events`.
- GREEN: `agentfeed-frontend` remote CI `26797162315` for `ea216a7`
  - Run CI gate passed.
  - Audit production dependencies passed.
  - URL: https://github.com/downingmoon/agentfeed-frontend/actions/runs/26797162315

## 남은 리스크

> [!warning]
> 이번 검증은 helper/static contract와 production build 중심입니다. 실제 브라우저에서 username conflict를 발생시키는 click-level E2E는 별도 browser interaction harness 후보로 남아 있습니다.

다음 상위 후보:

- Hosted OAuth happy-path live smoke를 credentialed CI/release lane으로 승격.
- Live browser hydration smoke를 remote CI/manual scheduled artifact gate로 승격.
- CLI same-draft concurrency를 two-process smoke로 보강.
