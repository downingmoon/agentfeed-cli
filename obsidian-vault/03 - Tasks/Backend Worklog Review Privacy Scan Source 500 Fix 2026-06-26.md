---
title: Backend Worklog Review Privacy Scan Source 500 Fix 2026-06-26
aliases:
  - Worklog review privacy_scan source 500 fix
status: done
tags:
  - agentfeed/backend
  - agentfeed/bugfix
  - agentfeed/deploy
  - project/tasks
updated: 2026-06-26
---

# Backend Worklog Review Privacy Scan Source 500 Fix 2026-06-26

## 결론

인증된 review URL `http://161.33.171.81:13030/worklogs/9011800f-990b-4631-9576-a8840ced74f1/review`에서 backend 500이 발생했다. 원인은 `privacy_scan_json`에 저장된 내부 metadata `source: "client"`가 review response model `PrivacyScanResult(extra="forbid")`에 그대로 들어가 `ResponseValidationError`를 만든 것이다.

## 원인 증거

- Backend log: `fastapi.exceptions.ResponseValidationError`.
- Validation loc: `('response', 'data', 'privacy_scan', 'source')`.
- Message: `Extra inputs are not permitted`.
- Runtime DB row: 해당 worklog `privacy_scan_json` = `{ "source": "client", "status": "safe", "findings": [] }`.

## 변경

- `agentfeed-backend/app/services/worklog_review.py`
  - review response 조립 시 `privacy_scan`을 response-safe fields로 sanitize.
  - 허용 scan field: `status`, `findings`.
  - 허용 finding field: `id`, `type`, `severity`, `message`, `field`, `resolved`, `resolution`.
  - schema를 느슨하게 하지 않고 기존 strict response contract 유지.
- `agentfeed-backend/tests/test_worklog_review_privacy_contracts.py`
  - `privacy_scan_json.source`가 저장돼도 review response에는 노출되지 않고 `WorklogReviewResponse.model_validate`가 통과하는 regression test 추가.

## Commit

- `agentfeed-backend` `a8eb85b` — `Sanitize review privacy scan payloads`

## 검증

- Red test first: 신규 test가 `source` 잔존 때문에 실패함 확인.
- Targeted green: `uv run pytest -q tests/test_worklog_review_privacy_contracts.py::test_worklog_review_strips_private_privacy_scan_source_before_response_validation` 통과.
- Related contracts: `uv run pytest -q tests/test_worklog_review_privacy_contracts.py tests/test_worklog_response_model_contracts.py tests/test_route_response_model_contracts.py` → 13 passed.
- Full backend tests: `uv run pytest -q` → 442 passed, 1 existing Starlette/httpx deprecation warning.
- Lint: `uv run ruff check .` 통과.
- Compile: `uv run python -m compileall -q app tests` 통과.
- LSP diagnostics unavailable: `Transport closed`; pytest/ruff/compileall로 대체.

## 배포/Runtime QA

- 현재 서버 canonical name: `trading-bot`; Codex가 이 서버 위에서 실행 중이라 SSH 없음.
- `/home/ubuntu/dev/agentfeed/agentfeed-backend` → `/home/ubuntu/agentfeed/agentfeed-backend` rsync.
- Backend force-recreate, backend healthy.
- Authenticated API QA: generated short JWT for worklog author, `GET /v1/worklogs/9011800f-990b-4631-9576-a8840ced74f1/review` returned `privacy_scan = {"status":"safe","findings":[]}` and `safe_public_preview = true`.
- Playwright browser QA passed: public frontend review URL opened with auth cookie, review API returned 200, `internal server error` not visible.
- Backend logs after fix show review URL `200 OK`, no `ResponseValidationError`/500 for that path.

## 후행 TODO

- [x] User-reported review URL backend 500 fixed and deployed.
- [x] Regression test added.
- [x] Manual browser QA completed.
