---
title: Commercial Readiness Hardening - Token Rotation Quota and Notification Legacy Routing 2026-06-03
aliases:
  - Token Rotation Quota Boundary
  - Legacy Comment Notification Routing
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/notifications
status: done
created: 2026-06-03
updated: 2026-06-03
---

# Commercial Readiness Hardening - Token Rotation Quota and Notification Legacy Routing 2026-06-03

> [!summary]
> 이번 ultrawork continuation은 외부 hosted blocker와 별개로 로컬에서 닫을 수 있는 운영 회귀 리스크를 처리했다. Backend ingestion token rotation은 active token quota가 꽉 찬 상태에서도 기존 토큰 교체가 계속 가능해야 하므로 service/router/CLI exchange 경로를 회귀 테스트로 고정했다. Frontend notification link helper는 legacy `comment` target이 parent worklog id를 함께 제공할 때 comment id가 아닌 worklog route로 이동하도록 보강했다.

## 배경

- 상용 운영에서는 토큰이 유출되었거나 기기를 교체한 사용자가 quota boundary에서도 기존 토큰을 안전하게 rotate할 수 있어야 한다.
- 현재 Backend 구현은 rotate 경로에서 quota count를 새 토큰 생성 경로처럼 적용하지 않아 동작은 맞지만, 이 불변식이 테스트 이름만으로는 충분히 고정되어 있지 않았다.
- Frontend notification route helper는 current Backend `worklog_comment` 계약(`target.type='worklog'`, `target.id=<worklog_id>`, extra `comment_id=<comment_id>`)은 처리하지만, legacy/imported `target.type='comment'` payload가 parent worklog id를 별도 필드로 줄 경우 comment id route로 빠질 수 있었다.

## 변경 사항

### Backend

- `tests/test_contracts.py`
  - `rotate_ingestion_token` service가 quota full 상태에서도 replacement token을 발급하고 quota count query를 사용하지 않음을 고정했다.
  - browser-approved CLI exchange rotation 경로가 quota full 상태에서도 `rotated_from`을 반환하고 session을 consumed로 마무리함을 고정했다.
  - settings-managed token rotation route도 quota full 상태에서 기존 token name을 유지하며 성공함을 고정했다.

### Frontend

- `src/lib/notifications.ts`
  - notification worklog route id 해석을 helper로 분리했다.
  - `target.type='worklog'`은 기존처럼 `target.id`를 사용한다.
  - `target.type='comment'`은 `worklog_id` → `worklogId` → `parent_worklog_id` → legacy `id` 순서로 parent worklog route id를 찾는다.
- `src/lib/api.ts`
  - notification target 타입에 parent worklog id alias 필드를 명시했다.
- `src/lib/api-contract.test.ts`
  - current Backend worklog-comment 계약은 그대로 유지한다.
  - legacy comment notification payload가 parent `worklog_id`를 제공하면 comment id가 아니라 worklog id로 라우팅하는 회귀 테스트를 추가했다.
  - parent id가 없는 legacy comment payload는 기존 fallback을 유지한다.

## 검증

```bash
# Backend targeted
uv run --locked --group dev ruff check tests/test_contracts.py
uv run --locked --group dev pytest -q tests/test_contracts.py -k 'rotate_ingestion_token_allows_replace_when_active_token_quota_is_full or rotate_managed_ingestion_token_uses_existing_name_by_default or cli_auth_exchange_rotates_requested_token_after_browser_approval'

# Frontend targeted
npm run test:contracts
npm run lint

# Broader gates
uv run --locked --group dev ruff check app tests
uv run --locked --group dev pytest -q
NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build
cd ../agentfeed-dev && ./scripts/test-all.sh
```

- Backend targeted: `3 passed, 316 deselected`.
- Backend full: `343 passed, 1 warning`.
- Frontend contracts/lint/build: passed.
- Cross-repo `agentfeed-dev ./scripts/test-all.sh`: passed, including CLI `364 passed`, Frontend CI/build/audit, Backend `343 passed`, and Alembic offline migration chain.

## 남은 리스크

> [!warning]
> 최종 hosted readiness는 여전히 외부 인프라 상태에 막혀 있다. `api.agentfeed.dev` DNS가 비어 있고 `https://agentfeed.dev/` root는 `/login`으로 307 redirect된다. 소스의 root route는 `LandingPage`를 직접 렌더링하므로 현재 실패는 배포/DNS freshness 문제로 분리한다.

## 관련

- [[Active Tasks]]
- [[Commercial Readiness Hardening - Mixed Auth Rate Limit and Notification Link Contract 2026-06-03]]
- [[Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31]]
- [[Integration - CLI Backend Frontend]]
