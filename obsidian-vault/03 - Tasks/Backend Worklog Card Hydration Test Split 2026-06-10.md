---
title: Backend Worklog Card Hydration Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/quality
status: done
---

# Backend Worklog Card Hydration Test Split 2026-06-10

> [!success]
> Worklog 카드 hydration/list-query batching 계약 테스트 3개를 `tests/test_contracts.py`에서 전용 파일로 분리했다. 기능 변경 없이 테스트 소유권과 리뷰 가능성을 개선했다.

## 목적

Enterprise 완성도 목표에서 `tests/test_contracts.py`가 너무 커져 API surface별 회귀 원인 추적이 어려웠다. 이번 패스는 Frontend 목록/프로젝트/내 대시보드가 의존하는 WorklogCard hydration 계약을 별도 파일로 분리해 CLI-Frontend-Backend 계약 검증을 더 명확하게 만든다.

## 변경 사항

- Backend 신규 테스트 파일:
  - `tests/test_worklog_card_hydration_contracts.py`
- `tests/test_contracts.py`에서 아래 테스트를 이동:
  - `test_project_worklogs_use_batched_card_hydration`
  - `test_my_worklogs_batches_card_hydration_for_owner_dashboard`
  - `test_my_bookmarks_propagates_following_author_viewer_state`

## 보존한 계약

- 프로젝트 worklogs 목록은 batched WorklogCard hydrator를 사용한다.
- 소유자 dashboard worklogs 목록은 row별 author/project/social query를 추가하지 않는다.
- 내 bookmarks 목록은 `bookmarked`와 `following_author` viewer state를 보존한다.

## 검증 증거

Pre-split 기준선:

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'project_worklogs_use_batched_card_hydration or my_worklogs_batches_card_hydration_for_owner_dashboard or my_bookmarks_propagates_following_author_viewer_state'
3 passed, 277 deselected in 0.57s
```

Focused split 검증:

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_card_hydration_contracts.py --fix
All checks passed!

uv run --locked --group dev pytest tests/test_worklog_card_hydration_contracts.py
3 passed in 0.62s
```

Backend 전체 검증:

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_card_hydration_contracts.py
All checks passed!

uv run --locked --group dev pytest
428 passed, 1 warning in 3.73s
```

Cross-repo 검증:

```text
node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh
AgentFeed OpenAPI contract gate passed.
CLI: 28 files / 591 tests passed, release preflight passed, npm audit 0 vulnerabilities
Frontend: typecheck, contract tests, mock API compatibility, production build, npm audit passed
Backend: ruff passed, 428 passed, Alembic offline migration chain passed
```

## 후속 과제

> [!todo]
> 다음 refactor 후보는 아직 `tests/test_contracts.py`에 남아 있는 `search/tags privacy filtering` 영역이다. Search/Tags는 Frontend discovery 화면과 직접 연결되어 있으므로 별도 contract 파일로 분리하면 계약 소유권이 더 명확해진다.

> [!info]
> 이번 패스에서는 신규 기능 추가와 서버 배포를 하지 않았다.
