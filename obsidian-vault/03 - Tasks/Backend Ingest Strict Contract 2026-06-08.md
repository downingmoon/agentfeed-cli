---
title: Backend Ingest Strict Contract 2026-06-08
date: 2026-06-08
tags:
  - agentfeed
  - backend
  - cli
  - contract
  - privacy
status: done
---

# Backend Ingest Strict Contract 2026-06-08

## 목적

[[CLI Privacy Sample Upload Strip 2026-06-08]]에서 CLI가 `sample_redacted`를 서버로 보내지 않도록 정리했지만, Backend ingest boundary가 계약 밖 필드를 조용히 무시하면 같은 drift가 다시 숨어들 수 있다. Enterprise 품질 기준으로 CLI → Backend ingest request는 fail-closed contract여야 한다.

## 변경

### Backend

- `app/schemas/ingestion.py`
  - ingest request 전용 `StrictIngestModel`을 추가해 top-level/source/project/worklog/privacy scan request object의 extra field를 forbid 처리했다.
  - response/shared worklog schemas는 건드리지 않아 기존 저장 데이터나 public response 렌더링 위험을 넓히지 않았다.
  - ingest 전용 `IngestPrivacyFinding`, `IngestPrivacyScanResult`를 추가했다.
- `tests/test_contracts.py`
  - unknown root field, unknown worklog field, `privacy_scan.findings[].sample_redacted`가 `IngestRequest` validation에서 실패하는 회귀 테스트를 추가했다.

### Dev contract gate

- `scripts/check-openapi-contract.mjs`
  - `REQUEST_BODY_FORBIDDEN_FIELD_CONTRACTS`를 추가했다.
  - `/v1/ingest/worklogs`와 `/v1/ingest/worklogs/preview` request schema에 `privacy_scan.findings[].sample_redacted`, `worklog.raw_transcript`가 노출되면 실패한다.
- `scripts/test-all.sh`
  - forbidden request field gate가 빠지지 않도록 static grep guard를 추가했다.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run --python 3.12 --locked --group dev ruff check app/schemas/ingestion.py tests/test_contracts.py
uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'ingest_privacy_scan_schema_matches_storage_and_contract_bounds or ingest_source_identity'

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash -n scripts/test-all.sh scripts/check-openapi-contract.mjs
```

결과:

- Backend ruff: pass
- Backend targeted pytest: `3 passed, 368 deselected`
- Dev OpenAPI contract gate: pass
- Forbidden request body fields checked: `4 fields across 2 operations`
- diff whitespace check: pass

## 후행 과제

> [!note]
> 이번 작업은 ingest request boundary만 strict 처리했다. 오래된 public worklog metrics/response JSON이 있을 수 있으므로 shared response schema 전체에 `extra=forbid`를 일괄 적용하지 않았다.

- [x] Frontend/CLI mutating request schemas도 endpoint별 extra-field fail-closed 정책을 적용했다: [[Frontend Request Strict Contract 2026-06-08]].
- [ ] 오래된 저장 데이터 migration/normalization 정책이 생기면 shared response schema strict 적용 가능성을 다시 검토한다.
