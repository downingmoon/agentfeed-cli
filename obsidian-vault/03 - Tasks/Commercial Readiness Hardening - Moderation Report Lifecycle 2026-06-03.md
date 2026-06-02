---
title: Commercial Readiness Hardening - Moderation Report Lifecycle 2026-06-03
aliases:
  - Moderation Report Lifecycle
  - Report 상태관리 API
  - 운영자 신고 큐
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

# Commercial Readiness Hardening - Moderation Report Lifecycle 2026-06-03

> [!summary]
> 신고 생성만 가능하던 report 기능을 최소 운영자 lifecycle로 닫았다. Backend는 `MODERATOR_USER_IDS` allowlist 기반 moderation API와 DB check constraint를 추가했고, Frontend는 `/moderation/reports` 운영자 화면과 API client를 추가했다.

## 배경

- [[Active Tasks]]의 상용화 목표 중 report/moderation은 신고 접수 API만 존재하고 처리 루프가 없었다.
- 병렬 탐색 결과:
  - Backend `reports.status` 컬럼은 존재하지만 상태 전환 API가 없었다.
  - Frontend는 신고 제출 UX만 있고 운영자 큐가 없었다.
  - Admin/role 모델을 바로 도입하면 마이그레이션 범위가 커지므로, 첫 상용화 단계는 환경변수 allowlist로 운영자 접근을 제한한다.

## 변경 사항

### Backend

- `app/config.py`
  - `MODERATOR_USER_IDS` 추가.
  - UUID 형식 validation 및 canonical parsing 추가.
- `app/models/social.py`
  - `reports.target_type`, `reports.reason`, `reports.status` DB check constraint 추가.
- `alembic/versions/025_report_moderation_constraints.py`
  - 기존 reports 테이블에 moderation lifecycle constraint 추가.
- `app/schemas/moderation.py`
  - `ModerationReport`, `UpdateModerationReportStatusRequest`, lifecycle literal 타입 추가.
- `app/routers/moderation.py`
  - `GET /v1/moderation/reports?status=&limit=`
  - `PATCH /v1/moderation/reports/{report_id}/status`
  - `MODERATOR_USER_IDS` 기반 `ForbiddenError` 접근 차단.
  - 상태 변경 audit event: `moderation.report.status_updated`.
- `app/main.py`, `app/middleware/rate_limit.py`
  - moderation router 등록 및 route별 rate-limit rule 추가.

### Frontend

- `src/lib/api.ts`
  - `ApiModerationReportStatus`, `ApiModerationReport`, `moderation.listReports`, `moderation.updateReportStatus` 추가.
- `src/components/pages/ModerationReportsPage.tsx`
  - `/moderation/reports` 운영자 큐 UI 추가.
  - 상태 필터: `open`, `reviewing`, `resolved`, `dismissed`.
  - report별 pending guard, `role="status"`, `role="alert"` 적용.
- `src/app/moderation/reports/page.tsx`
  - Next route 추가.
- `src/lib/auth-next.ts`, `src/contexts/AppContext.tsx`
  - moderation route를 OAuth next/auth recovery 대상에 추가.
- `src/lib/api-contract.test.ts`, `src/lib/page-source-contract.test.ts`
  - API 경로/메서드/body 및 page source contract 추가.

## 검증

```bash
# Backend
uv run --locked --group dev ruff check app tests
uv run --locked --group dev pytest -q
uv run --locked alembic heads

# Frontend
npm run test:contracts
npm run lint
NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build

# Dev orchestrator
node scripts/check-openapi-contract.mjs
./scripts/test-all.sh
```

- Backend cibl 테스트: moderation/report lifecycle 관련 7개 통과.
- Backend 전체 테스트: `340 passed, 1 warning`.
- Alembic head: `025_report_moderation_constraints`.
- Frontend contract/typecheck: 통과.
- Frontend build: production-safe URL 기준으로 확인.
- Dev OpenAPI contract: `75` operations, client contracts `70`, schema fields `99` 통과.
- Dev 전체 게이트: CLI full suite/release preflight, Frontend CI/build, Backend pytest/alembic offline migration chain 통과.

## 남은 리스크

> [!warning]
> 운영자 권한은 아직 DB role 모델이 아니라 `MODERATOR_USER_IDS` 환경변수 allowlist다. 첫 상용 릴리즈에 필요한 최소 안전장치로는 충분하지만, 장기적으로는 admin/moderator role + audit UI + moderation history table을 별도 설계해야 한다.

- 외부 릴리즈 블로커는 여전히 별개:
  - `api.agentfeed.dev` DNS/deployment 준비.
  - `https://agentfeed.dev/` stale `/login` redirect 해소.

## 관련

- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend Review Privacy Preview Contract 2026-06-03]]
- [[Commercial Readiness Hardening - Frontend Hosted Readiness Preflight 2026-06-03]]
- [[Integration - CLI Backend Frontend]]
