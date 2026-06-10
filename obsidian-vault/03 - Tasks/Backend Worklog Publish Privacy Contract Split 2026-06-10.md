---
title: Backend Worklog Publish Privacy Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - worklog
  - privacy
  - publish
status: done
---

# Backend Worklog Publish Privacy Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 worklog publish/privacy 계약 테스트 11개를 dedicated files로 분리했다. 서버/인프라/CICD 변경 및 배포는 하지 않았다.

## Why

- Publish는 CLI 수집 → Review → 공개/비공개 전환으로 이어지는 핵심 안전 경계다.
- Privacy finding schema, publish-time server scan, unresolved finding gate가 catch-all에 섞여 있어 회귀 원인 추적이 어려웠다.
- 파일을 schema / publish scan / publish state gate로 나눠 책임과 크기 한계를 분리했다.

## Changed

- `agentfeed-backend/tests/test_privacy_finding_contracts.py`
  - `test_privacy_finding_contract_rejects_unknown_type_and_severity`
- `agentfeed-backend/tests/test_worklog_publish_privacy_scan_contracts.py`
  - `test_publish_runs_server_privacy_scan_when_scan_missing_and_blocks_detected_secrets`
  - `test_publish_server_privacy_scan_blocks_secret_in_model_field_when_scan_missing`
  - `test_publish_server_privacy_scan_blocks_secret_in_timeline_when_scan_missing`
  - `test_publish_rescans_client_safe_privacy_scan_and_blocks_detected_secrets`
  - `test_publish_records_safe_server_privacy_scan_when_scan_missing`
- `agentfeed-backend/tests/test_worklog_publish_privacy_state_contracts.py`
  - `test_ingested_preresolved_critical_finding_still_blocks_until_review_resolution`
  - `test_publish_rejects_unresolved_blocking_privacy_findings`
  - `test_publish_allows_unresolved_nonblocking_privacy_findings`
  - `test_publish_allows_resolved_blocking_privacy_findings`
  - `test_publish_reports_only_blocking_privacy_findings`

## Size

```text
3629 tests/test_contracts.py
  34 tests/test_privacy_finding_contracts.py
 236 tests/test_worklog_publish_privacy_scan_contracts.py
 233 tests/test_worklog_publish_privacy_state_contracts.py
4132 total
```

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_privacy_finding_contracts.py tests/test_worklog_publish_privacy_scan_contracts.py tests/test_worklog_publish_privacy_state_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_privacy_finding_contracts.py tests/test_worklog_publish_privacy_scan_contracts.py tests/test_worklog_publish_privacy_state_contracts.py
# 27 passed in 0.78s
```

```text
uv run --locked --group dev pytest tests/test_contracts.py -k '<moved publish/privacy tests>'
# 133 deselected / 0 selected, exit_code=5
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 4.65s
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
# Request body field contracts checked: 240 fields across 22 operations with additionalProperties=false
```

```text
bash scripts/test-all.sh
# CLI: 591 passed; typecheck; release preflight; npm audit 0 vulnerabilities
# Frontend: typecheck; contract tests; mock API compatibility; production build; npm audit 0 vulnerabilities
# Backend: ruff; 428 passed; alembic offline migration chain captured
```

## Follow-up

- [ ] Continue decomposing `tests/test_contracts.py` by discovery/search/project/user ownership until the catch-all file no longer carries unrelated contract domains.
- [ ] Keep future privacy finding schema tests in `test_privacy_finding_contracts.py`.
- [ ] Keep future publish-time server scan tests in `test_worklog_publish_privacy_scan_contracts.py`.
- [ ] Keep future unresolved finding/publish gate tests in `test_worklog_publish_privacy_state_contracts.py`.
- [ ] Keep server/infra/CICD and deployment deferred unless explicitly overridden.
