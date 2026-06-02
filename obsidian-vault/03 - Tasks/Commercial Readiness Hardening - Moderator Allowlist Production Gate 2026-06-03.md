---
title: Commercial Readiness Hardening - Moderator Allowlist Production Gate 2026-06-03
aliases:
  - Moderator Allowlist Production Gate
  - MODERATOR_USER_IDS production gate
  - Moderation 권한 UX
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/moderation
  - project/tasks
status: done
created: 2026-06-03
updated: 2026-06-03
---

# Commercial Readiness Hardening - Moderator Allowlist Production Gate 2026-06-03

> [!summary]
> [[Commercial Readiness Hardening - Moderation Report Lifecycle 2026-06-03]] 이후 남은 운영 리스크를 닫았다. Backend는 production-like 환경에서 `MODERATOR_USER_IDS`가 비면 boot 단계에서 fail-fast하고, Frontend는 moderation API 403을 일반 API 실패가 아니라 운영자 권한/allowlist 설정 문제로 명확히 안내한다.

## 배경

- report/moderation lifecycle API와 `/moderation/reports` UI가 생겼지만, production 설정에서 moderator allowlist가 비어도 서버가 기동될 수 있으면 신고 처리 기능이 상용 환경에서 사실상 dead feature가 된다.
- DB role 모델은 아직 도입하지 않았으므로 첫 상용화 단계의 운영자 권한 source of truth는 `MODERATOR_USER_IDS`다.
- 따라서 production/staging boot gate가 allowlist 누락을 숨기지 않아야 한다.

## 변경 사항

### Backend

- `app/config.py`
  - non-development 환경에서 `MODERATOR_USER_IDS` non-empty를 강제한다.
  - 기존 UUID validation과 함께 빈 문자열/빈 리스트를 production safety error로 처리한다.
- `tests/test_contracts.py`
  - `production_settings()` fixture가 moderator UUID를 포함하도록 정렬했다.
  - `MODERATOR_USER_IDS=""`, `","`가 production 설정에서 실패하는 regression을 추가했다.

### Frontend

- `src/components/pages/ModerationReportsPage.tsx`
  - `ApiError` 403을 감지해 “운영자 권한이 필요하며 Backend `MODERATOR_USER_IDS` 설정에 현재 사용자 ID를 추가해야 한다”는 구체 문구로 변환한다.
  - 목록 load 실패도 같은 formatter를 사용해 권한 문제를 일반 API 장애와 구분한다.
- `src/lib/page-source-contract.test.ts`
  - moderation page가 403 permission failure와 `MODERATOR_USER_IDS` 안내 문구를 유지하도록 source contract를 추가했다.

## 검증

```bash
# Backend targeted
uv run --locked --group dev ruff check app tests
uv run --locked --group dev pytest -q tests/test_contracts.py -k 'production_settings or moderator or moderation'

# Frontend targeted
npm run test:contracts
npm run lint

# Dev contract
node scripts/check-openapi-contract.mjs
```

- Backend targeted: `13 passed, 304 deselected`.
- Frontend contract/typecheck: 통과.
- Dev OpenAPI contract: 통과.

## 남은 리스크

> [!warning]
> 장기적으로는 `MODERATOR_USER_IDS` 환경변수 allowlist 대신 DB-backed `admin/moderator` role과 moderator assignment UI가 필요하다. 현재 변경은 첫 상용화 release에서 “운영자 설정 누락”으로 신고 처리 루프가 죽는 것을 막는 최소 fail-fast gate다.

- 외부 hosted blocker는 여전히 별개다.
  - `api.agentfeed.dev` DNS/deployment 준비.
  - `https://agentfeed.dev/` stale `/login` redirect 해소.

## 관련

- [[Active Tasks]]
- [[Commercial Readiness Hardening - Moderation Report Lifecycle 2026-06-03]]
- [[Integration - CLI Backend Frontend]]
- [[Runtime Configuration]]
