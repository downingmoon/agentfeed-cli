---
title: Backend Public Privacy Scan Fail Closed
date: 2026-06-10
type: task
status: done
tags:
  - agentfeed/backend
  - agentfeed/privacy
  - agentfeed/contracts
related:
  - "[[Privacy Safety]]"
  - "[[Backend Worklog Public Metadata Boundary]]"
---

# Backend Public Privacy Scan Fail Closed

## 결론

Backend public worklog payload가 저장된 `privacy_scan.status`의 malformed 값을 `safe`로 바꾸지 않도록 수정했다.

이제 public card/detail boundary에서 알 수 없는 privacy scan status가 발견되면 `danger`로 닫힌다.

## 배경

기존 `build_public_privacy_scan()`은 `status`가 없거나 알 수 없는 값일 때 `safe`로 default 했다.

- `status` 누락: 기존 draft/legacy 데이터 호환을 위해 `safe` 유지
- `status` malformed: contract drift 또는 저장 데이터 손상 가능성이 있으므로 `safe`로 보이면 안 됨

Enterprise 품질 기준에서는 malformed privacy 상태를 안전으로 보여주는 것이 가장 위험하다.

## 변경 사항

Backend:

- `app/services/worklog_public_metadata.py`
  - public source/scan metadata boundary를 분리.
  - malformed privacy scan status를 `danger`로 fail-closed.
- `app/services/worklog_timeline.py`
  - outcome/timeline normalization을 분리.
- `app/services/worklog_card_payload.py`
  - worklog card payload builder를 분리.
- `app/services/worklog.py`
  - 기존 import surface는 유지하면서 oversized service file을 196 pure LOC로 축소.
- `tests/test_worklog_public_source_contracts.py`
  - invalid privacy scan status가 `danger`가 되는 계약으로 red/green 갱신.

## Red evidence

```bash
uv run pytest tests/test_worklog_public_source_contracts.py::test_public_privacy_scan_fails_closed_on_invalid_status -q
```

초기 실패:

- expected: `{"status": "danger", "findings": []}`
- actual: `{"status": "safe", "findings": []}`

## Green evidence

```bash
uv run ruff check app/services/worklog.py app/services/worklog_card_payload.py app/services/worklog_public_metadata.py app/services/worklog_timeline.py tests/test_worklog_public_source_contracts.py
uv run pytest tests/test_worklog_public_source_contracts.py tests/test_contracts.py::test_normalize_outcome_supports_legacy_agent_shape_without_500 tests/test_contracts.py::test_normalize_timeline_supports_legacy_rows_without_500 tests/test_contracts.py::test_normalize_timeline_drops_unknown_status_without_500 -q
uv run pytest -q
```

결과:

- ruff: passed
- targeted: 10 passed
- backend full test: 439 passed, 1 existing Starlette/httpx deprecation warning

## LOC evidence

```text
app/services/worklog.py                  196
app/services/worklog_card_payload.py      78
app/services/worklog_public_metadata.py   33
app/services/worklog_timeline.py          95
tests/test_worklog_public_source_contracts.py 182
```

## 후행 과제

- `status` 누락 legacy 데이터가 계속 `safe`로 보이는 정책이 장기적으로 적절한지 데이터 migration 시점에 재검토한다.
- `tests/test_contracts.py`는 아직 oversized catch-all이므로 기존 계획대로 domain별 분리를 계속한다.
- Frontend privacy scan badge가 `danger` 상태를 충분히 강하게 보여주는지 별도 UI smoke에서 확인한다.

## 배포

서버/인프라/CICD/배포 작업 없음.
