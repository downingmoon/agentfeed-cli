---
title: Commercial Readiness Hardening - Mixed Auth Rate Limit and Notification Link Contract 2026-06-03
aliases:
  - Mixed Auth Rate Limit Principal
  - Notification Link Contract
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/notifications
status: done
created: 2026-06-03
updated: 2026-06-03
---

# Commercial Readiness Hardening - Mixed Auth Rate Limit and Notification Link Contract 2026-06-03

> [!summary]
> 이번 ultrawork continuation은 외부 hosted blocker를 제외하고 로컬에서 닫을 수 있는 운영 정합성 gap을 처리했다. Backend rate-limit identity가 browser cookie와 Bearer token이 동시에 온 mixed-auth 요청에서 실제 auth path와 다른 user bucket을 사용할 수 있던 P2 리스크를 닫고, Frontend worklog comment notification deep-link 계약을 회귀 테스트로 고정했다.

## 배경

- `get_current_user_optional()`은 browser `access_token` cookie를 먼저 평가하고, cookie가 invalid/stale이면 Bearer JWT로 fallback한다.
- `request_rate_limit_identity()`는 반대로 Bearer JWT를 먼저 평가했다.
- 따라서 mixed-client 요청에서 API 실행 주체는 cookie user인데 rate-limit bucket은 Bearer user가 되는 불일치가 가능했다.
- 이 상태는 권한 우회는 아니지만, abuse-control/accountability/quota economics를 어렵게 만드는 상용 운영 P2 리스크다.

## 변경 사항

### Backend

- `app/middleware/rate_limit.py`
  - non-IP-based route의 user rate-limit identity를 cookie JWT → non-ingestion Bearer JWT 순서로 평가하도록 변경했다.
  - 이 순서는 `app/dependencies.py`의 browser/session auth precedence와 일치한다.
  - invalid cookie + valid Bearer fallback은 유지한다.
  - ingestion token 형태 `af_live_*`는 browser user JWT bucket 후보에서 제외한다.
- `tests/test_contracts.py`
  - mixed cookie/Bearer 요청의 rate-limit identity가 cookie-only identity와 동일함을 검증한다.
  - invalid cookie + valid Bearer는 Bearer identity로 fallback함을 검증한다.
  - ingestion Bearer + valid cookie는 cookie identity를 유지함을 검증한다.

### Frontend

- `src/lib/api-contract.test.ts`
  - Backend worklog comment notification 계약을 고정했다.
  - `target.type='worklog'`, `target.id=<worklog_id>`, extra `comment_id=<comment_id>` 형태에서 링크는 parent worklog로 유지해야 한다.
  - 이 테스트는 comment id를 worklog id로 오인하는 future regression을 막는다.

## 검증

```bash
# Backend targeted
uv run --locked --group dev ruff check app/middleware/rate_limit.py tests/test_contracts.py
uv run --locked --group dev pytest -q tests/test_contracts.py -k 'rate_limit_identity_matches_auth_cookie_then_bearer_precedence_for_mixed_clients or rate_limit_identity_prefers_valid_user_subject'

# Frontend targeted
npm run test:contracts
npm run lint
```

- Backend targeted pytest: `2 passed, 316 deselected`.
- Backend ruff: passed.
- Frontend contracts: passed.
- Frontend typecheck/lint: passed.

## 남은 리스크

> [!warning]
> 외부 hosted release blocker는 여전히 별도다. `api.agentfeed.dev` DNS/deployment와 `https://agentfeed.dev/` root stale `/login` redirect가 해결되어야 default commercial readiness gate가 최종 green이 된다.

- Cross-repo `agentfeed-dev ./scripts/test-all.sh`와 원격 CI는 후속 검증 단계에서 확인한다.
- CLI timeout retry P1 후보는 현재 Backend `source_identity_hash` idempotency와 CLI duplicate-ingest recovery 테스트가 이미 방어 중임을 확인했다. dedicated lookup API는 현재 Backend contract에 없으므로 이번 slice에서 새 API를 추가하지 않았다.

## 관련

- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend Mixed Auth and Proxy Identity 2026-06-02]]
- [[Commercial Readiness Hardening - Session Expiry and OAuth Audit Atomicity 2026-06-02]]
- [[Integration - CLI Backend Frontend]]
