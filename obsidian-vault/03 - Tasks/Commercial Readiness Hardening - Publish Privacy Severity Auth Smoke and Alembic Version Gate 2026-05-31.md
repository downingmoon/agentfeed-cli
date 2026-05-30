---
title: Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/privacy
  - agentfeed/auth
  - agentfeed/devops
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31

## 목적

CLI/API/Frontend 상용화 readiness 기준에서 public/unlisted publish 직전 privacy gate, browser-login token exchange, live smoke migration gate를 하나의 실제 경로로 잠갔습니다.

> [!important]
> Database/fresh row state를 기준으로 Backend publish/review 계약을 맞추고, Frontend 문구와 dev smoke가 같은 fail-closed severity taxonomy를 검증하도록 정렬했습니다.

## 발견한 문제

1. Frontend는 unresolved `critical`/`unknown` privacy finding을 차단하지만 Backend publish API는 `high`만 차단하던 정책 불일치 위험이 있었습니다.
2. Backend review API는 fresh `PrivacyFinding` row를 읽은 뒤에도 `worklog.privacy_scan_json`으로 전체 scan을 덮어써, resolve 후 review 화면이 stale unresolved 상태로 보일 수 있었습니다.
3. `make smoke-e2e`는 CLI browser-login session create/approve/exchange와 privacy finding block/resolve/publish success를 실제로 검증하지 않았습니다.
4. Live smoke 중 Alembic revision id `011_visibility_status_constraints`가 기본 `alembic_version.version_num VARCHAR(32)`보다 길어 migration이 실패했습니다.

## 변경 사항

### Backend

- `NON_BLOCKING_PRIVACY_SEVERITIES = {"info", "low", "medium"}` 외 severity는 fail-closed blocking으로 처리합니다.
- `public`과 `unlisted` publish 모두 unresolved blocking finding이 있으면 `UNRESOLVED_PRIVACY_FINDING`으로 차단합니다.
- Review API는 DB `PrivacyFinding` row가 있으면 fresh row를 `privacy_scan` source of truth로 사용합니다.
- `011_visibility_status_constraints` migration에서 `alembic_version.version_num`을 `VARCHAR(64)`로 확장해 긴 revision id chain을 안전하게 통과시킵니다.

### Frontend

- Review page copy를 `high severity` 중심에서 `blocking privacy finding`으로 정렬했습니다.
- `critical` / `unknown` / blank severity도 danger color로 표시해 Backend fail-closed 정책과 UX 표현을 맞췄습니다.

### Dev smoke

- `make smoke-e2e`가 dev user를 만든 뒤 CLI auth session을 생성/승인/교환하고, 교환된 ingestion token으로 CLI upload를 수행합니다.
- Upload 후 unresolved `critical` privacy finding과 stale `privacy_scan_json`을 seed합니다.
- Publish 422 `UNRESOLVED_PRIVACY_FINDING` → resolve API → review API fresh resolved row 확인 → publish success → public detail/feed `user_note` 비노출까지 검증합니다.
- Frontend review route smoke는 SSR/dev HTML에서 안정적으로 확인 가능한 `WorklogReviewPage` shell을 기준으로 검증합니다.

## 검증 증거

- Backend targeted gate:
  - `RUFF_NO_CACHE=1 uv run ruff check --no-cache alembic/versions/011_visibility_status_constraints.py app/routers/worklogs.py app/exceptions.py app/models/ingestion.py tests/test_contracts.py`
  - `PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q tests/test_contracts.py -k 'publish_rejects_unresolved_blocking_privacy_findings or publish_allows_unresolved_nonblocking_privacy_findings or publish_allows_resolved_blocking_privacy_findings or publish_reports_only_blocking_privacy_findings or worklog_review_marks_unknown_privacy_severity_as_danger or worklog_review_prefers_fresh_privacy_rows_over_stale_scan_json or worklog_review_keeps_user_note_private or visibility_status_migration_expands_alembic_version_column'` → 24 passed
- Frontend contract gate:
  - `npm run test:contracts -- --run`
- Dev smoke syntax:
  - `bash -n scripts/smoke-e2e.sh`
- Live E2E:
  - `make smoke-e2e` → passed
- Cross-repo commercial gate:
  - `make test` in `../agentfeed-dev` → passed (CLI 232 tests/prepack/audit, Frontend contracts/build/audit, Backend ruff/199 tests/Alembic offline)

## 남은 리스크

> [!warning]
> 실제 browser hydration에서 public UI에 `user_note`가 렌더링되지 않는지는 API/adapter/smoke payload 계약으로 간접 검증했습니다. 브라우저 렌더링 자체는 이후 Playwright smoke를 추가하면 더 강해집니다.

## 관련 링크

- [[Privacy Safety#2026-05-31 Publish privacy severity fail-closed]]
- [[Integration - CLI Backend Frontend#2026-05-31 CLI auth publish privacy smoke and Alembic version gate]]
- [[Auth & Credential Safety#2026-05-31 CLI auth exchange live smoke token path]]
- [[Commercial Readiness Hardening - Smoke User Note Privacy Contract 2026-05-31]]
- [[Active Tasks#P1 후보]]
