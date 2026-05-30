---
title: Commercial Readiness Hardening - Auth Maintenance and Rendered Smoke 2026-05-30
date: 2026-05-30
tags:
  - agentfeed/commercial-readiness
  - security/auth
  - project/tasks
  - smoke/e2e
status: implemented
aliases:
  - 2026-05-30 auth maintenance and rendered smoke
---

# Commercial Readiness Hardening - Auth Maintenance and Rendered Smoke 2026-05-30

> [!summary]
> 운영 DB에 이미 존재할 수 있는 GitHub provider identity 중복/legacy plaintext token 리스크를 진단하는 Backend dry-run 도구를 추가하고, dev E2E smoke가 review/feed HTML shell까지 검증하도록 확장했습니다.

## 구현 요약

### Backend auth account maintenance

- `app/services/auth_maintenance.py`를 추가해 auth account 운영 점검 로직을 service layer에 분리했습니다.
- `auth_accounts(provider, provider_user_id)` 중복을 grouped query로 찾고, 각 duplicate group의 `auth_account_ids` / `user_ids`를 JSON-friendly report로 반환합니다.
- `access_token_encrypted` / `refresh_token_encrypted` 중 `af1:` prefix가 없는 legacy plaintext provider token row를 찾습니다.
- `rotate_legacy_plaintext_provider_tokens(..., dry_run=True)`는 기본적으로 mutation/commit을 하지 않습니다.
- `dry_run=False`일 때만 대상 row를 `FOR UPDATE SKIP LOCKED`로 잡고 기존 `rotate_legacy_provider_tokens()` helper를 재사용해 encryption backfill을 수행합니다.
- `scripts/auth_account_maintenance.py`를 추가했습니다.
  - 기본 실행은 dry-run JSON report입니다.
  - `--apply`를 명시해야 legacy token rotation을 commit합니다.
  - duplicate provider identity가 있으면 dry-run/apply 모두 exit code `2`로 fail-closed 처리하고 수동 merge를 요구합니다.

> [!warning] 운영 원칙
> 이 도구는 duplicate auth account를 자동 merge하지 않습니다. 어떤 AgentFeed user를 보존할지 판단해야 하므로, 자동 수정은 legacy token encryption backfill로만 제한했습니다.

### Dev rendered smoke gate

- `agentfeed-dev/scripts/smoke-e2e.sh`에 `assert_contains` helper를 추가했습니다.
- Review API 검증에 `status == needs_review`와 `preview.public_fields` non-empty assertion을 추가했습니다.
- Frontend review route는 HTTP 200뿐 아니라 server-rendered shell을 확인합니다.
  - `<title>AgentFeed — AI agent로 만든 작업을 공유하세요</title>`
  - `Review 불러오는 중…`
- Frontend feed route도 HTTP 200뿐 아니라 rendered metadata/page shell을 확인합니다.
  - `<title>Public Feed — AgentFeed</title>`
  - `Public Feed`

> [!note]
> Review/feed의 실제 worklog content는 client component가 hydrate 후 API에서 가져옵니다. 따라서 seeded content의 semantic 검증은 API assertion에 두고, curl HTML 검증은 route shell/metadata에 한정했습니다.

## 검증

- Backend targeted lint/test:
  - `uv run --python 3.12 --locked --group dev ruff check app/services/auth.py app/services/auth_maintenance.py scripts/auth_account_maintenance.py tests/test_auth_maintenance.py` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests/test_auth_maintenance.py -q` → `5 passed`
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'provider_token or auth_account_provider_identity or github_login_reuses or github_login_rejects'` → `6 passed, 90 deselected`
- Backend script smoke:
  - `uv run --python 3.12 --locked --group dev python scripts/auth_account_maintenance.py --help` → passed
- Backend full gate:
  - `uv run --python 3.12 --locked --group dev ruff check .` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests -q` → `109 passed`
- Dev static/full gate:
  - `bash -n scripts/smoke-e2e.sh && ./scripts/test-all.sh` → passed
- Dev live E2E:
  - `cd ../agentfeed-dev && ./scripts/smoke-e2e.sh` → passed, including review/feed rendered shell assertions

## 관련 링크

- [[Commercial Readiness Audit 2026-05-30]]
- [[Commercial Readiness Hardening - Auth Race and Login Smoke 2026-05-30]]
- [[Auth & Credential Safety#2026-05-30 Auth account maintenance dry-run]]
- [[Integration - CLI Backend Frontend#2026-05-30 Review and feed rendered smoke gate]]
- [[Live E2E Smoke Gate Hardening 2026-05-30]]
- [[Active Tasks#새로 발견한 P1 후보 / 다음 루프]]
