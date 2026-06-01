---
title: Settings Token Revoke Confirmation
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/commercial-readiness
  - agentfeed/token-lifecycle
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Auth & Credential Safety]]"
  - "[[Active Tasks]]"
---

# Settings Token Revoke Confirmation

> [!success]
> Frontend Settings의 ingestion token revoke가 더 이상 한 번의 클릭만으로 CLI device token을 비활성화하지 않습니다. `rotate`와 동일하게 사용자 확인을 거친 뒤 Backend mutation을 호출합니다.

## 배경

상용화 리스크 스캔 중 Settings token lifecycle UI에서 다음 불균형을 확인했습니다.

- `rotateToken()`은 `window.confirm(...)`으로 destructive action을 확인했습니다.
- `revokeToken()`은 확인 없이 즉시 `me.revokeIngestionToken(token.id)`를 호출했습니다.
- revoke는 특정 CLI device token을 즉시 중단시키는 irreversible에 가까운 운영 액션이므로 accidental click 방지가 필요합니다.

## 변경 사항

- `src/components/pages/SettingsPage.tsx`
  - revoke 실행 전에 `window.confirm(`Revoke ${token.name}? This token will stop working immediately.`)`를 요구합니다.
  - confirm 취소 시 `revokingId` 설정이나 API mutation 없이 즉시 반환합니다.
  - revoke 성공 copy를 `Any CLI using it must run agentfeed login or agentfeed rotate.`로 확장해 복구 경로를 안내합니다.
- `src/lib/page-source-contract.test.ts`
  - revoke confirmation contract를 고정했습니다.
  - revoke 성공 copy가 CLI 재연결 경로를 안내하는지 고정했습니다.

## Regression contract

> [!example]
> `npm run test:contracts`는 구현 전 먼저 실패했습니다.
>
> - 실패 메시지: `settings token revoke must require explicit confirmation before disabling a CLI device token`
> - 구현 후 동일 contract가 통과했습니다.

## 검증 증거

> [!example] Frontend
> - `npm run test:contracts` → failed first on the new revoke confirmation contract
> - `npm run test:contracts` → passed after implementation
> - `npm run lint` → passed
> - `git diff --check` → passed
> - `npm run ci` → passed

> [!example] Cross-repo
> - `make test` in `agentfeed-dev` → passed
> - OpenAPI operations checked: 69
> - Client contracts checked: 66 (`cli`: 6, `frontend`: 60)
> - AgentFeed CLI tests: 262 passed
> - Backend pytest: 226 passed, 1 warning
> - Alembic offline migration chain generated successfully

## 병렬 스캔에서 남은 후속 후보

> [!warning]
> 이번 slice는 Frontend destructive-token UX만 다뤘습니다. 병렬 스캔 결과 다음 P1 후보는 별도 slice로 남겨둡니다.

- Frontend CSP `style-src`가 아직 `'unsafe-inline'`을 허용해 production style-injection hardening 여지가 있음.
- Frontend auth next-intent가 dynamic prefix route query context를 안전 allowlist로 보존하지 못할 수 있음.
- Frontend worklog detail malformed payload가 partial/controlled retry 대신 전체 error state로 떨어질 수 있음.
- Frontend 401 auth error handling이 pending/social optimistic state를 sign-out path만큼 정리하지 못할 수 있음.
- CLI `AGENTFEED_CREDENTIAL_STORE=auto`가 keychain unavailable 상태에서 plaintext file fallback으로 조용히 downgrade될 수 있음.
- CLI agent session collection이 structured cwd가 없는 session을 현재 프로젝트 후보로 받아 wrong-project attribution을 만들 수 있음.
- Backend production `ENVIRONMENT` typo/missing을 startup에서 fail-fast하지 못할 수 있음.
- Backend DB rate-limit store failure가 production에서 process-local memory fallback으로 축소될 수 있음.

## 관련 링크

- [[Commercial Readiness Hardening - Settings Named Token Creation 2026-05-31]]
- [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30]]
- [[Integration - CLI Backend Frontend]]
- [[Auth & Credential Safety]]
- [[Active Tasks]]
