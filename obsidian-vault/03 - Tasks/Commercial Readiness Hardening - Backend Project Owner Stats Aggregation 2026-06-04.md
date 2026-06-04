---
title: Commercial Readiness Hardening - Backend Project Owner Stats Aggregation 2026-06-04
aliases:
  - Backend Project Owner Stats Aggregation
  - Private Project Stats DB Aggregation
status: done
created: 2026-06-04
tags:
  - agentfeed/backend
  - agentfeed/performance
  - agentfeed/projects
  - agentfeed/commercial-readiness
  - project/tasks
---

# Commercial Readiness Hardening - Backend Project Owner Stats Aggregation 2026-06-04

## 결과

> [!success]
> Project owner/private stats 경로가 worklog `metrics_json` rows를 application layer로 가져와 합산하지 않고, DB aggregate query로 계산합니다.

## 문제

- Project detail과 project list owner view는 상용화 이후 worklog 수가 누적될수록 stats 계산 비용이 증가합니다.
- 이전 구현은 private/owner stats에서도 모든 matching worklog row의 `metrics_json`과 `agent`를 hydrate한 뒤 Python에서 합산했습니다.
- Public stats는 author metric privacy masking 때문에 row-level privacy 평가가 필요하지만, owner/private stats는 masking 없이 aggregate로 이전할 수 있습니다.

## 구현

- `agentfeed-backend/app/services/project.py`
  - private/owner `get_project_stats()`를 단일 SQL aggregate query로 이전.
  - private/owner `get_project_stats_by_project_ids()`를 `GROUP BY worklogs.project_id` aggregate로 이전.
  - aggregate fields:
    - `worklog_count`
    - `total_tokens`
    - `total_files`
    - `total_lines_added`
    - `total_lines_removed`
    - `total_tests`
    - `total_commits`
    - `contributor_count`
    - `agents_used`
  - Public stats path는 기존 row-level privacy behavior 유지.
- `agentfeed-backend/tests/test_contracts.py`
  - private single-project stats가 1 query aggregate인지 검증.
  - private multi-project stats가 project_id grouped aggregate인지 검증.
  - public privacy tests는 그대로 통과하여 masking contract 유지.

## 검증

> [!example] Targeted
> `ruff check app/services/project.py tests/test_contracts.py` → passed
>
> `pytest tests/test_contracts.py -k "project_stats_use_single_db_aggregate or project_stats_by_project_ids_use_grouped_db_aggregate or public_project_stats_respect_author_metric_privacy or public_project_stats_exclude_unpublished_worklogs"` → 4 passed

> [!success] Full backend
> `ruff check .` → passed
>
> `pytest` → 383 passed, 1 warning

## 남은 리스크

> [!warning]
> Public project stats는 author별 metric privacy가 전체 totals를 `None`으로 만들 수 있는 contract가 있어서 row-level 평가를 유지했습니다. 이 경로까지 aggregate화하려면 privacy masking semantics를 SQL CASE로 정확히 재현하는 별도 설계가 필요합니다.

## 관련 링크

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend Project Read Path Batching 2026-06-04]]
- [[Commercial Readiness Hardening - Backend Dashboard Metric Aggregation 2026-06-04]]
