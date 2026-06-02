---
title: Commercial Readiness Hardening - Backend Mixed Auth and Proxy Identity 2026-06-02
aliases:
  - Backend mixed cookie bearer auth fallback
  - Trusted proxy malformed XFF identity hardening
  - API auth and rate limit identity P2 hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/rate-limit
  - agentfeed/runtime-config
  - agentfeed/security
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - Backend Mixed Auth and Proxy Identity 2026-06-02

> [!success] 목표
> 운영 환경에서 stale browser cookie가 valid Bearer client를 막지 않게 하고, trusted proxy 배포에서 malformed `X-Forwarded-For` hop 하나가 전체 IP identity를 shared proxy IP로 붕괴시키지 않게 합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P2 후보]]
- 인증 영역: [[Auth & Credential Safety#2026-06-02 Backend mixed cookie bearer auth fallback]]
- 런타임 설정 영역: [[Runtime Configuration#2026-06-02 Trusted proxy malformed XFF identity hardening]]
- 병렬 audit 근거: Backend sidecar audit가 P1은 없다고 판단했고, 상용 운영 P2 후보로 mixed cookie/Bearer fallback과 malformed forwarded chain identity를 제시했습니다.

## 발견한 gap

### Mixed cookie/Bearer auth fallback

`get_current_user_optional()`은 browser `access_token` cookie가 존재하면 `Authorization: Bearer`를 평가하지 않았습니다. stale/corrupt/revoked cookie와 valid Bearer token이 함께 오는 mixed-client 환경에서 valid API client가 anonymous/401처럼 처리될 수 있었습니다.

### Malformed forwarded chain identity collapse

Trusted proxy 뒤에서 `X-Forwarded-For` chain 중 하나가 malformed이면 `_forwarded_ip()`가 전체 chain을 버리고 proxy client IP로 fallback했습니다. reverse proxy 배포에서 malformed hop 하나가 여러 사용자의 rate-limit identity를 shared proxy bucket으로 합칠 수 있었습니다.

## 변경 범위

- `agentfeed-backend/app/dependencies.py`
  - cookie token과 non-ingestion Bearer token을 후보 목록으로 평가합니다.
  - cookie가 invalid, malformed, deleted user, logout-revoked token이면 다음 후보인 Bearer token을 계속 평가합니다.
  - direct unit call에서 FastAPI `Header(None)`/`Cookie(None)` sentinel이 들어와도 string token만 후보로 취급합니다.
- `agentfeed-backend/app/middleware/rate_limit.py`
  - `X-Forwarded-For` parsing 중 malformed hop은 skip합니다.
  - 유효한 hop이 하나도 없을 때만 기존처럼 trusted proxy client IP로 fallback합니다.
- `agentfeed-backend/tests/test_contracts.py`
  - stale cookie + valid Bearer fallback contract 추가.
  - mixed malformed XFF chain에서도 유효한 rightmost untrusted IP를 유지하는 contract 추가.

## 고정된 계약

- Active browser cookie가 정상 인증되면 기존처럼 cookie user identity가 우선입니다.
- Ingestion token 형태 `Bearer af_live_*`는 browser session auth fallback 후보가 아닙니다.
- Invalid cookie만으로 valid Bearer API client를 막지 않습니다.
- Trusted proxy forwarding은 malformed hop을 신뢰하지 않지만, malformed hop 하나 때문에 전체 chain의 유효한 client evidence를 버리지 않습니다.
- All-invalid forwarded chain은 기존 fail-safe fallback인 direct proxy client IP identity를 유지합니다.

## 검증 증거

- RED: `.venv/bin/pytest tests/test_contracts.py -q -k 'current_user_optional_uses_valid_bearer_when_browser_cookie_is_invalid'`
  - 실패 원인: `assert None is user`; stale cookie가 valid Bearer 평가를 막음.
- RED: `.venv/bin/pytest tests/test_contracts.py -q -k 'rate_limit_identity_uses_rightmost_untrusted_forwarded_ip_and_rejects_invalid_values'`
  - 실패 원인: mixed malformed forwarded chain이 `ip:10.0.0.8` proxy bucket으로 fallback.
- GREEN: 두 targeted pytest 모두 통과.
- GREEN: `.venv/bin/ruff check app tests && .venv/bin/pytest -q`
  - `ruff`: All checks passed.
  - `pytest`: 285 passed, 1 known Starlette/httpx deprecation warning.
- GREEN: `agentfeed-dev ./scripts/test-all.sh` 통과.
  - OpenAPI contract gate passed: 70 operations, 67 client contracts, 22 response field contracts, 110 request body fields, 72 schema fields.
  - CLI: 321 tests passed, typecheck passed, release preflight passed, dependency audit found 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build passed, dependency audit found 0 vulnerabilities.
  - Backend: ruff passed, 285 tests passed, Alembic offline migration chain generated through `019_audit_events`.

## 남은 리스크

> [!warning]
> 이번 루프는 backend API 운영 신뢰성 P2 두 건을 닫은 진행 작업입니다. Frontend profile two-step save partial success와 CLI concurrent publish serialization은 다음 P2 후보로 남아 있습니다.
