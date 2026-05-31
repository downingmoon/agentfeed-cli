---
title: Commercial Readiness Hardening - Auth Identity Response Models and JSON Side Effects 2026-05-31
aliases:
  - Auth Identity Response Models JSON Side Effects
  - 2026-05-31 Auth Response Model JSON Side Effect Hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
  - hardening
status: verified
created: 2026-05-31
---

# Commercial Readiness Hardening - Auth Identity Response Models and JSON Side Effects 2026-05-31

관련: [[AgentFeed CLI MOC]], [[Auth & Credential Safety]], [[Integration - CLI Backend Frontend]], [[Active Tasks]]

> [!abstract] 목표
> 직전 감사에서 남긴 P1/P2 후보 3개를 닫았습니다. Backend는 high-traffic route의 machine-readable `response_model`을 고정했고, Frontend는 `/auth/me` identity payload를 AppContext 진입 전에 정규화하며, CLI는 `share --json` 자동화 경로의 clipboard/browser side effect를 명시 opt-in으로 회귀 검증합니다.

## 수정 범위

### Backend — high-traffic response model first slice

> [!success]
> `/health`, `/v1/auth/me`, `/v1/me/settings*` route가 이제 schema contract를 OpenAPI/FastAPI route metadata에 노출합니다.

계약:

- `/health`는 `HealthResponse`를 반환합니다.
- `/v1/auth/me`는 `DataResponse[AuthMeResponse]`로 고정합니다.
- `AuthMeResponse`에 `location`을 포함해 Backend 응답과 Frontend `ApiAuthMe` 계약을 맞췄습니다.
- `/v1/me/settings`, `/v1/me/settings/privacy`, `/v1/me/settings/notifications`는 `DataResponse[UserSettingsResponse]`로 고정합니다.
- Contract test가 해당 route들의 `response_model`과 auth schema field를 확인합니다.

### Frontend — auth identity boundary normalization

> [!success]
> malformed `/auth/me` 성공 응답이 `currentUser`에 그대로 들어가 signed-in shell을 깨뜨리는 경로를 차단했습니다.

계약:

- `normalizeAuthMe()`는 unknown payload를 `ApiAuthMe | null`로 정규화합니다.
- `id` 또는 `username` 중 하나도 usable string이 아니면 `null`을 반환합니다.
- `display_name`, profile URLs, `location`, timezone/timestamps는 안전한 string/null fallback을 갖습니다.
- `auth.me()`는 API envelope를 받은 뒤 `normalizeAuthMe(r.data)`를 반환합니다.
- `AppContext`는 `null` auth user면 `currentUser=null`, `signedIn=false`로 유지합니다.
- CLI 승인 페이지도 `auth.me()`의 `null` 결과를 sign-in 필요 상태로 처리합니다.

### CLI — `share --json` side-effect regression matrix

> [!success]
> automation-friendly JSON upload가 기본적으로 stdout 외 side effect를 만들지 않음을 테스트로 고정했습니다.

계약:

- `agentfeed share --json` 기본값은 review URL을 clipboard에 복사하지 않고 browser도 열지 않습니다.
- `--clipboard`와 `--open-review`가 명시될 때만 각각 side effect가 발생합니다.
- upload 실패 시 두 flag가 있어도 clipboard/browser opener는 호출되지 않습니다.
- 테스트는 fake clipboard/browser executable log가 생성되지 않는지까지 확인합니다.

## 검증 증거

- CLI targeted: `npm test -- --run tests/cli-share.test.ts && npm run typecheck` → 13 tests passed, typecheck passed
- CLI full: `npm test -- --run` → 19 files / 251 tests passed
- Backend targeted: `.venv/bin/pytest tests/test_contracts.py -q -k "high_traffic_routes_have_response_models or rate_limit_rules_cover_critical_mutation_paths"` → 2 passed
- Backend full: `.venv/bin/pytest -q` → 209 passed, 1 warning
- Frontend targeted: `npm run test:contracts && npm run lint` → passed
- Frontend build: `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build` → passed

## 남은 상용화 후보

> [!warning]
> 전체 상용화 목표는 아직 진행 중입니다. 이번 루프는 high-traffic first slice를 닫았고, 아래는 다음 루프 후보입니다.

- Backend 나머지 public/list/detail route의 `response_model` coverage 확대.
- Frontend `auth.me()` null handling이 필요한 다른 route/page가 생기면 source contract에 추가.
- 실제 dev stack smoke에서 auth identity normalization과 JSON side-effect 경로를 한 번 더 확인.

## 연결되는 계약

- [[Integration - CLI Backend Frontend#2026-05-31 High-traffic response model first slice]]
- [[Auth & Credential Safety#2026-05-31 Auth identity normalization boundary]]
- [[Integration - CLI Backend Frontend#2026-05-31 CLI share JSON side-effect contract]]
