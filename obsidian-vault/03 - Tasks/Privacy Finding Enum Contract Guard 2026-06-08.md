---
title: Privacy Finding Enum Contract Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/contracts
  - agentfeed/frontend
  - agentfeed/backend
  - project/tasks
aliases:
  - Privacy finding enum guard
---

# Privacy Finding Enum Contract Guard 2026-06-08

> [!success] 완료
> Backend `PrivacyFinding.type` / `PrivacyFinding.severity`는 closed `Literal`인데 Frontend API boundary가 `string`으로 열려 있던 drift를 닫았다. 이제 unknown privacy finding type/severity는 review/detail API parser에서 fail-closed 된다.

## 배경

[[Active Tasks]]의 Enterprise 품질 goal 기준에서 privacy finding은 publish gate에 직접 영향을 준다. Backend schema는 이미 `possible_secret`, `private_url`, `email_address`, `api_key_pattern`, `env_file_reference`, `sensitive_path`, `database_url`, `other` 및 severity `info`, `low`, `medium`, `high`, `critical`, `unknown`으로 닫혀 있었지만, Frontend `ApiPrivacyFinding`은 type/severity를 `string`으로 열어두고 있었다.

## 변경 범위

### Backend

- `tests/test_contracts.py`
  - `PrivacyFinding`, `IngestPrivacyFinding`, `PrivacyScanResult`, `IngestPrivacyScanResult`가 backend-supported privacy type/severity만 받는 회귀 테스트 추가.
  - unknown `type`, `severity`, `resolution` rejection 확인.

### Frontend

- `src/lib/api.ts`
  - `ApiPrivacyFindingType` union 추가.
  - `ApiPrivacySeverity` union 추가.
  - `ApiPrivacyFinding.type` / `severity`를 broad string에서 backend union으로 축소.
  - `normalizePrivacyFindingForContract()`에서 `requireOneOfForContract()`로 unknown type/severity fail-closed 처리.
- `src/components/pages/WorklogReviewPage.tsx`
  - page-local defensive privacy finding validator도 backend enum을 기준으로 type/severity를 닫음.
  - privacy scan unavailable synthetic row는 backend-supported `type: "other"`, `severity: "unknown"`으로 정리.
- `src/lib/worklog-actions.ts`
  - publish gate helper는 malformed severity를 방어적으로 blocking 처리해야 하므로 입력 severity를 `unknown`으로 유지.
- `src/lib/api-contract.test.ts`, `src/lib/page-source-contract.test.ts`
  - unknown privacy finding type/severity rejection 및 source guard 추가.

## 검증 Evidence

```bash
# Backend targeted
uv run pytest tests/test_contracts.py::test_privacy_finding_contract_rejects_unknown_type_and_severity tests/test_contracts.py::test_worklog_action_schemas_reject_invalid_enums_with_pydantic_validation
uv run ruff check tests/test_contracts.py

# Backend full
uv run pytest
uv run ruff check .

# Frontend
npm run test:contracts
npm run lint

# CLI/docs regression
npm run release:preflight
```

- Backend full: `415 passed`, `ruff check .` 통과.
- Frontend contract/lint: 통과.
- CLI release preflight: `27 test files`, `568 tests passed`.

## 후행 과제

> [!todo]
> API normalizer가 privacy finding `resolution` field를 UI에서 사용하지 않아 현재는 ignore한다. 추후 review UI에서 resolution 상태를 표시해야 한다면 Backend schema와 Frontend API type/parser를 함께 확장한다.
