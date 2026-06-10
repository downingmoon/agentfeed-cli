---
type: task
status: done
created: 2026-06-10
repos:
  - agentfeed-backend
  - AgentFeed-CLI
related:
  - "[[Frontend Dashboard Action URL Dot Segment Guard 2026-06-10]]"
---

# Backend Dashboard Action URL Dot Segment Guard 2026-06-10

## 배경

Frontend에서 dashboard recent worklog action URL의 `.` / `..` path segment를 fail-closed 하도록 고친 뒤, Backend response schema도 같은 contract를 보장해야 했다.

`DashboardRecentWorklog.action_url`은 내부 경로만 허용해야 하며, 브라우저나 프록시가 정규화할 수 있는 raw/encoded dot segment는 허용하지 않는다.

## 변경

- `agentfeed-backend/app/schemas/dashboard.py`
  - `DashboardRecentWorklog.action_url` validator에 raw/URL-decoded dot segment rejection 추가.
  - malformed percent-decoding은 안전하게 invalid 처리.
- `agentfeed-backend/tests/test_dashboard_contracts.py`
  - `/worklogs/../review`, `/worklogs/%2e%2e`, `/worklogs/%2e%2e/review` invalid contract 추가.

## Contract

Dashboard recent worklog action URL은 아래만 허용한다.

- `/worklogs/:id`
- `/worklogs/:id/review`

그리고 모든 path segment는 raw/URL-decoded 기준으로 `.` 또는 `..`이면 invalid다.

## 검증

- Red 확인: `uv run pytest tests/test_dashboard_contracts.py -q`가 dot-segment case에서 실패함.
- Green 확인:
  - `uv run pytest tests/test_dashboard_contracts.py -q` → 3 passed
  - `uv run ruff check app/schemas/dashboard.py tests/test_dashboard_contracts.py` → passed
  - `uv run pytest tests/test_dashboard_contracts.py tests/test_dashboard_count_response_model_contracts.py tests/test_route_response_model_contracts.py -q` → 11 passed
- LSP diagnostics: `basedpyright-langserver` 미설치로 실행 불가.

## 남은 점검

- 현재 변경은 dashboard recent worklog action URL contract에 한정한다.
- 다른 서버 생성 URL도 path traversal/dot-segment가 사용자 입력에서 파생되는지 별도 pass에서 확인한다.
