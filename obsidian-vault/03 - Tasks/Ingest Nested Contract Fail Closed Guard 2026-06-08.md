---
title: Ingest Nested Contract Fail Closed Guard 2026-06-08
aliases:
  - CLI Backend ingest nested contract guard
status: done
date: 2026-06-08
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/dev
  - agentfeed/contract
  - agentfeed/evidence
---

# Ingest Nested Contract Fail Closed Guard 2026-06-08

> [!success]
> CLI upload payload와 Backend ingest schema를 다시 대조한 결과, 현재 shipped field 이름 자체의 drift는 발견되지 않았다. 대신 nested ingest 객체가 알 수 없는 field를 조용히 무시할 수 있는 구멍을 발견해 fail-closed 계약으로 보강했다.

## 변경 범위

- [[Integration - CLI Backend Frontend]]
- Backend `app/schemas/worklog.py`
  - `OutcomeItem`, `CollectionSource`, `AgentMetricSummary`, `WorklogMetrics`, `WorklogTimelineItem`에 `extra="forbid"` 적용.
  - CLI가 `worklog.metrics.*`, `agent_metrics[]`, `collection_sources[]`, `timeline[]`에 계약 밖 필드를 보내면 서버가 무시하지 않고 validation error로 실패한다.
- Backend `tests/test_contracts.py`
  - metrics / nested agent metrics / collection sources / timeline item extra field rejection 회귀 테스트 추가.
- Dev `scripts/check-openapi-contract.mjs`
  - CLI ingest request field contract가 nested object의 `additionalProperties=false`까지 확인하도록 확장.

## 검증 Evidence

```text
Backend targeted contracts:
.venv/bin/pytest -q tests/test_contracts.py -k "ingest_source or worklog_metrics_preserve_agent_session_activity_fields or ingest_worklog_payload_preserves_model_for_database_column or ingest_privacy_scan_schema_matches_storage_and_contract_bounds"
=> 8 passed, 364 deselected

Backend lint:
.venv/bin/ruff check app/schemas/worklog.py tests/test_contracts.py
=> All checks passed!

Dev OpenAPI gate:
node scripts/check-openapi-contract.mjs
=> AgentFeed OpenAPI contract gate passed.
=> Request body field contracts checked: 240 fields across 22 operations with additionalProperties=false

CLI typecheck:
npm run typecheck
=> tsc --noEmit passed

CLI focused upload/privacy/git draft tests:
npm run test -- --run tests/api-hook.test.ts tests/privacy.test.ts tests/git-draft.test.ts
=> 3 test files, 166 tests passed
```

## 후행 과제

- [ ] 실제 사용자 브라우저 GitHub credential까지 포함한 live login smoke는 owner 수동 확인이 필요하다.
- [ ] production domain이 생기면 HTTP/IP-only override 없이 hosted readiness와 compatibility smoke를 다시 실행한다.
- [ ] 기존 DB에 예전 ingest metrics extra field가 저장된 사례가 있으면, stricter response validation 전에 migration/cleanup 여부를 확인한다.

## 관련 노트

- [[CLI Ingest Request Contract Guard 2026-06-08]]
- [[Backend Ingest Strict Contract 2026-06-08]]
- [[Frontend Request Strict Contract 2026-06-08]]
- [[Active Tasks]]

## 개인서버 배포 Evidence

> [!success] 2026-06-08 개인서버 배포 완료
> 이번 contract hardening 변경 후 `agentfeed-dev` 배포 스크립트로 개인서버 `161.33.171.81`에 동기화/재시작했고, Backend/Frontend/Postgres health와 hosted compatibility smoke를 확인했다.

```text
make server-up
=> agentfeed-server-backend-1 healthy, 0.0.0.0:18080->8000
=> agentfeed-server-frontend-1 healthy, 0.0.0.0:13030->3000
=> agentfeed-server-postgres-1 healthy, 127.0.0.1:15432->5432

curl http://161.33.171.81:18080/health/ready
=> {"status":"ready","database":{"connected":true,"revision":"027_browser_session_version"},"migration":{"up_to_date":true}}

curl http://161.33.171.81:18080/v1/metadata
=> service=agentfeed-api, api_version=v1, contract_version=2026-06-03, review_base_url=http://161.33.171.81:13030

curl -I http://161.33.171.81:13030/feed
=> HTTP/1.1 200 OK

server container schema smoke
=> nested-extra-rejected

AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
make smoke-hosted-compatibility
=> HOSTED_COMPATIBILITY_SMOKE_PASSED
```
