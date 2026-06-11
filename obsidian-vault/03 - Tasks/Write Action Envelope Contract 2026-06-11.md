---
type: task-note
created: 2026-06-11
status: completed
repos:
  - agentfeed-frontend
  - agentfeed-backend
  - AgentFeed-CLI
scope: contract-hardening
---

# Write Action Envelope Contract 2026-06-11

## 목표

CLI-API-Frontend 상용화 품질 점검 중, 쓰기 액션 응답에서 백엔드가 금지하는 추가 필드를 프론트엔드가 조용히 받아들이지 않는지 확인했다.

## 확인한 계약

- 백엔드는 `DataResponse`, `ListResponse`, `OkResponse`와 각 payload schema에 `extra="forbid"`를 적용한다.
- 라우트 응답 모델은 `tests/test_route_response_model_contracts.py`에서 주요 쓰기 액션에 대해 고정되어 있다.
- 프론트엔드는 `apiFetch` 레벨에서 `DataResponse`/`ListResponse` envelope drift를 거부하지만, 일부 action payload normalizer는 예상 키 외 필드까지는 거부하지 않았다.

## 수정

Frontend에서 다음 쓰기/액션 payload normalizer가 예기치 않은 필드를 거부하도록 보강했다.

- social action: like, bookmark, follow
- comment/report action payload: comment, moderation report
- notification action: mark notification read
- worklog action: create, update, resolve finding, publish, unpublish

## 검증

- Frontend: `npm run lint && npm test`
- Backend: `uv run pytest tests/test_route_response_model_contracts.py tests/test_social_graph_contracts.py tests/test_social_report_contracts.py tests/test_notification_route_contracts.py tests/test_worklog_mutation_contracts.py`

결과: 모두 통과.

## 후속 과제

- 신규 기능 없음.
- 서버/배포/CICD 작업 없음.
- 다음 contract-hardening slice에서는 read/detail 계층 중 아직 `rejectUnexpectedKeysForContract`가 없는 normalizer를 별도 범위로 점검한다.
