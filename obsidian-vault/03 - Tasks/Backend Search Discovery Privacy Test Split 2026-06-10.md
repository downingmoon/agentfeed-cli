---
title: Backend Search Discovery Privacy Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/backend
  - agentfeed/contracts
  - agentfeed/search
  - agentfeed/privacy
status: done
---

# Backend Search Discovery Privacy Test Split 2026-06-10

> [!success]
> Search/Tags discovery privacy 계약 테스트 6개를 `tests/test_contracts.py`에서 전용 파일로 분리했다. 기능 추가 없이 검색·태그 API surface의 계약 소유권과 회귀 추적성을 개선했다.

## 목적

Frontend의 `/search`, `/explore`, tags/discovery 화면은 Backend 검색 결과가 사용자 privacy 설정을 정확히 반영한다는 계약에 의존한다. 기존에는 이 계약이 대형 `tests/test_contracts.py` 끝부분에 묻혀 있어 변경 영향 추적이 어려웠다. 이번 패스는 search/tags privacy 필터링과 pagination/query guard 계약을 별도 파일로 분리했다.

## 변경 사항

- Backend 신규 테스트 파일:
  - `tests/test_search_discovery_privacy_contracts.py`
- `tests/test_contracts.py`에서 아래 테스트 이동:
  - `test_search_worklogs_respects_author_search_indexing_setting`
  - `test_search_rejects_too_short_or_oversized_queries_before_wildcard_scans`
  - `test_search_prompts_respects_author_search_indexing_setting`
  - `test_search_uses_cursor_offset_and_pagination_metadata`
  - `test_search_suggestions_exclude_disabled_authors_and_owners`
  - `test_tags_exclude_disabled_search_indexing_authors`
- `FakeRowsResult`, `FakeTextDbSession`도 해당 전용 파일로 이동했다.

## 보존한 계약

- Worklog search는 작성자의 `allow_search_indexing` 설정을 존중한다.
- Prompt search는 published worklog와 search indexing 설정을 함께 존중한다.
- 너무 짧거나 과도하게 큰 query는 wildcard scan 전에 422로 차단한다.
- User search는 cursor offset pagination metadata를 유지한다.
- Search suggestions는 search indexing 비활성 작성자/소유자를 제외한다.
- Tags API는 search indexing 비활성 작성자의 worklog tag를 제외한다.

## 검증 증거

Pre-split 기준선:

```text
uv run --locked --group dev pytest tests/test_contracts.py -k 'search_worklogs_respects_author_search_indexing_setting or search_rejects_too_short_or_oversized_queries_before_wildcard_scans or search_prompts_respects_author_search_indexing_setting or search_uses_cursor_offset_and_pagination_metadata or search_suggestions_exclude_disabled_authors_and_owners or tags_exclude_disabled_search_indexing_authors'
6 passed, 271 deselected in 0.68s
```

Focused split 검증:

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_search_discovery_privacy_contracts.py --fix
All checks passed!

uv run --locked --group dev pytest tests/test_search_discovery_privacy_contracts.py
6 passed in 0.96s
```

Backend 전체 검증:

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_search_discovery_privacy_contracts.py
All checks passed!

uv run --locked --group dev pytest
428 passed, 1 warning in 1.98s
```

Cross-repo 검증:

```text
node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh
AgentFeed OpenAPI contract gate passed.
CLI: 28 files / 591 tests passed, typecheck/release preflight/audit passed
Frontend: typecheck, contract tests, mock API compatibility, production build, audit passed
Backend: ruff passed, 428 passed, Alembic offline migration chain passed
```

## 후속 과제

> [!todo]
> 다음 분리 후보는 `rate limit identity / request boundary`와 `public discovery response model` 경계다. 이미 일부 전용 파일이 있지만 `tests/test_contracts.py`에 남은 route response model assertion을 surface별로 더 잘게 나누면 계약 실패 원인을 더 빠르게 좁힐 수 있다.

> [!info]
> 이번 패스에서는 신규 기능 추가와 서버 배포를 하지 않았다.
