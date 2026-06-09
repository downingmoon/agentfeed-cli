---
title: Leaderboard Worklog Strict Response Boundary 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - contracts
  - strict-response
status: done
related:
  - "[[AgentFeed Current Product Brief]]"
  - "[[Auth Social Explore Ingestion Strict Response Boundary 2026-06-09]]"
  - "[[User Project Strict Response Boundary 2026-06-09]]"
---

# Leaderboard / Worklog Strict Response Boundary

> [!success] 완료
> Backend public response schema 중 `leaderboard.py`와 `worklog.py`에 남아 있던 extra-field 허용 구간을 닫았다.

## 변경 요약

- `app/schemas/leaderboard.py`
  - `LeaderboardMetric`
  - `LeaderboardViewerState`
  - `LeaderboardItem`
  - `LeaderboardResponse`
  - `LeaderboardListResponse`
- `app/schemas/worklog.py`
  - `WorklogSocialStats`
  - `WorklogViewerState`
  - `WorklogNormalizationDiagnostics`
  - `WorklogDiagnostics`
  - `WorklogCard`
  - `Worklog`
  - worklog create/update/publish/unpublish/privacy-finding action responses

## 검증

- [x] `uv run pytest tests/test_contracts.py::test_leaderboard_response_models_reject_extra_fields tests/test_contracts.py::test_worklog_public_response_models_reject_extra_fields -q`
- [x] `uv run pytest tests/test_contracts.py -q`
  - 결과: `398 passed, 1 warning`
- [x] Frontend avatar/profile source contract smoke
  - `npm test -- --run src/lib/page-source-contract.test.ts src/lib/worklog-author-avatar.contract.test.ts src/lib/api-contract.test.ts`

## 남은 주의점

> [!info]
> `NotificationTarget`은 이벤트 payload 확장을 위해 의도적으로 `extra="allow"`를 유지한다. 나머지 public response DTO는 fail-closed 방향이 맞다.
