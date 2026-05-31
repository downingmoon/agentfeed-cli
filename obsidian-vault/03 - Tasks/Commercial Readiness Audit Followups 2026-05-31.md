---
title: Commercial Readiness Audit Followups 2026-05-31
aliases:
  - 2026-05-31 Audit Followups
created: 2026-05-31
updated: 2026-05-31
status: backlog
tags:
  - agentfeed/commercial-readiness
  - agentfeed/audit
  - project/task
---

# Commercial Readiness Audit Followups 2026-05-31

> [!info]
> Backend / Frontend / CLI read-only audit에서 새로 발견된 상용화 readiness follow-up입니다. 이미 이번 CLI pass에서 처리한 항목은 [[Commercial Readiness Hardening - CLI Command and Token Trust Boundary 2026-05-31]]로 이동했습니다.

## P1

### Backend invalid/random Bearer rate-limit bypass

- 파일: `agentfeed-backend/app/main.py`, `agentfeed-backend/app/middleware/rate_limit.py`
- 문제: rate limit middleware가 endpoint auth보다 먼저 실행되지만, 임의 `Authorization: Bearer ...` 값을 token fingerprint bucket으로 신뢰하면 public/bootstrap endpoint에서 IP bucket을 우회할 수 있습니다.
- 최소 수정: unauthenticated/bootstrap/public route는 IP bucket을 항상 적용하거나, token bucket과 IP bucket을 둘 다 검사해 하나라도 제한되면 reject합니다.
- 검증 후보: `uv run pytest -q -p no:cacheprovider tests/test_rate_limit_store.py tests/test_contracts.py -k 'rate_limit or cli'`, `uv run ruff check --no-cache app tests`.

### Backend ingested privacy findings must not arrive pre-resolved

- 파일: `agentfeed-backend/app/schemas/worklog.py`, `agentfeed-backend/app/routers/ingest.py`, `agentfeed-backend/app/routers/worklogs.py`
- 문제: ingest payload의 `PrivacyFinding.resolved=true`를 그대로 저장하면 critical/high/unknown finding이 publish gate를 우회할 수 있습니다.
- 최소 수정: ingestion input에서 `resolved` / `resolution`을 무시하고 server-side `resolved=False`, `resolution=None`으로 저장합니다. Resolution은 review endpoint에서만 허용합니다.
- 검증 후보: `uv run pytest -q -p no:cacheprovider tests/test_contracts.py -k 'privacy and publish'`, `uv run ruff check --no-cache app tests`.

### Frontend Settings privacy/default visibility controls

- 파일: `agentfeed-frontend/src/lib/api.ts`, `agentfeed-frontend/src/components/pages/SettingsPage.tsx`
- 문제: `ApiPrivacySettings`의 default visibility와 public metric toggles 일부가 Settings UI에 없습니다.
- 최소 수정: `default_worklog_visibility`, `default_project_visibility`, `show_estimated_cost_publicly`, `show_file_count_publicly`, `show_line_count_publicly`, `show_test_count_publicly` controls를 추가하고 contract test로 field coverage를 고정합니다.
- 검증 후보: `npm run lint`, `npm run test:contracts`.

## P2

### Backend token-authenticated ingestion token rotation risk

- 파일: `agentfeed-backend/app/dependencies.py`, `agentfeed-backend/app/routers/ingest.py`, `agentfeed-backend/app/services/ingestion_tokens.py`, `agentfeed-backend/app/config.py`
- 문제: 현재 ingestion token 자체만으로 `/v1/ingest/token/rotate`가 가능하면 leaked token이 새 장기 token으로 self-rotate할 수 있습니다.
- 후보: browser/session-authenticated token management rotate만 기본 권장하고, token-authenticated renewal은 만료 임박 window / token-family reuse detection / notification / suspicious reuse family revoke를 검토합니다.

### Frontend leaderboard malformed-row isolation

- 파일: `agentfeed-frontend/src/components/pages/LeaderboardPage.tsx`
- 문제: malformed leaderboard item 하나가 `row.user.*` 또는 `row.main_metric.*` access에서 list를 crash시킬 수 있습니다.
- 최소 수정: adapter에서 usable user identity와 `main_metric.label/value`가 있는 row만 남깁니다.

### Frontend profile follow control hydration

- 파일: `agentfeed-frontend/src/components/pages/ProfilePage.tsx`
- 문제: `following=false`로 시작해 profile API/viewer state로 hydrate하지 않고, own profile Follow button suppression도 부족합니다.
- 후보: backend 지원 상태 확인 후 `ApiUserPublic` viewer follow state를 hydrate하고 pending/error rollback contract test를 추가합니다.

## 처리 완료로 이동된 항목

- [x] CLI configured command shell wrapper refusal
- [x] CLI configured command sensitive env scrub
- [x] CLI literal argv token login default-disable
- [x] CLI privacy scanner authorization header / credentialed URL / IPv6 private URL redaction

