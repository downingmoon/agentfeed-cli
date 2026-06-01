---
title: Commercial Readiness Hardening - Backend Publish Privacy Identity Defaults 2026-06-02
aliases:
  - Backend publish privacy ignore block
  - Backend ingest source identity conflict
  - Backend settings default visibility enforcement
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/privacy
  - agentfeed/integration
status: done
created: 2026-06-02
repositories:
  - agentfeed-backend
---

# Commercial Readiness Hardening - Backend Publish Privacy Identity Defaults 2026-06-02

## 목표

> [!abstract]
> Public/unlisted publish의 privacy gate를 server-owned 기준으로 강화하고, CLI ingest idempotency와 user default visibility 설정이 stale data 또는 무효 공개 범위를 만들지 않게 막습니다.

## 변경 계약

### Blocking privacy finding resolution

- `high` / `critical` / unknown 등 publish-blocking severity는 `ignored` resolution으로 해소할 수 없습니다.
- 과거 데이터에 `resolved=true`, `resolution=ignored`인 blocking finding이 남아 있어도 publish gate는 계속 차단합니다.
- Blocking finding은 `redacted` 또는 `removed`일 때만 publish-resolved 상태로 간주합니다.
- Review status도 같은 기준으로 danger/warning을 계산합니다.

### Server fallback privacy taxonomy

- Backend publish fallback scanner가 기존 secret/private URL 외에도 다음 public-field taxonomy를 차단합니다.
  - `email_address`
  - `env_file_reference` (`.env.local`, `.npmrc`, `.aws/credentials`, `.ssh/id_*` 등)
  - `sensitive_path` (`/Users/.../.ssh`, `/home/.../.aws/credentials` 등)
- 검사 대상은 `title`, `summary`, `model`, `public_prompt`, `changed_areas`, `outcome`, `tags`입니다.

### Ingest source identity conflict

- `collection_fingerprint`가 있으면 primary idempotency key입니다.
- 같은 `local_draft_id`라도 `collection_fingerprint`가 달라진 payload는 기존 worklog reuse 대신 `INGEST_SOURCE_IDENTITY_CONFLICT`로 차단합니다.
- Legacy row 호환을 위해 primary field match는 유지하되, secondary identity만 맞는 경우 silent stale reuse를 금지합니다.

### Settings default visibility

- `UserSettings.default_worklog_visibility` / `default_project_visibility`는 `private | unlisted | public`으로 schema와 DB constraint가 정렬됩니다.
- Worklog/project 생성 요청에서 `visibility`가 생략되면 authenticated user settings의 default visibility를 적용합니다.
- 명시적으로 보낸 `visibility`는 기존처럼 요청값을 우선합니다.

## 구현 파일

- `agentfeed-backend/app/routers/worklogs.py`
- `agentfeed-backend/app/routers/ingest.py`
- `agentfeed-backend/app/routers/projects.py`
- `agentfeed-backend/app/schemas/settings.py`
- `agentfeed-backend/app/models/settings.py`
- `agentfeed-backend/alembic/versions/017_user_settings_visibility_constraints.py`
- `agentfeed-backend/tests/test_contracts.py`

## 검증 증거

> [!success] RED → GREEN
> - RED: `uv run pytest tests/test_contracts.py -q -k "blocking_privacy_finding_cannot_be_resolved_as_ignored or previously_ignored_blocking_privacy_finding_still_blocks_publish or server_publish_privacy_scan_blocks_common_sensitive_public_fields or ingest_conflicting_local_draft_and_fingerprint_returns_conflict_not_stale_reuse or privacy_settings_visibility_defaults_reject_unknown_values or create_worklog_uses_user_default_visibility_when_omitted or create_project_uses_user_default_visibility_when_omitted or visibility_and_status_supported_values_are_database_constrained or create_worklog_accepts_only_owned_active_project_id"` → 8 failed, 1 passed.
> - Targeted GREEN: same command → 9 passed.
> - Backend regression: `uv run ruff check app tests && uv run pytest -q` → 275 passed, 1 warning.

## 남은 검증

- [x] Cross-repo `agentfeed-dev/scripts/test-all.sh` → CLI 296 passed, Frontend CI/build passed, Backend 275 passed, Alembic offline chain passed
- [x] Remote GitHub CI after push → `downingmoon/agentfeed-backend` run `26764801089` success (`8c2b07e`)

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Privacy Safety#2026-06-02 Backend publish privacy ignore and fallback taxonomy]]
- [[Integration - CLI Backend Frontend#2026-06-02 Backend ingest source identity and settings defaults]]
