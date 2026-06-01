---
title: Commercial Readiness Hardening - Public Timeline Settings and URL Privacy 2026-06-02
aliases:
  - Public timeline settings URL privacy hardening
  - 2026-06-02 timeline settings privacy hardening
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/privacy
  - agentfeed/settings
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-02
updated: 2026-06-02
---

# Commercial Readiness Hardening - Public Timeline Settings and URL Privacy 2026-06-02

## 목적

> [!important]
> Fresh commercial-readiness audit에서 나온 P1 gap을 CLI/API/Frontend 각각 하나씩 닫고, public discovery project leak P2도 함께 fail-closed로 보강했습니다.

닫은 위험:

- CLI privacy scanner가 `rediss://`, `mongodb+srv://`, broader loopback/CGNAT/unspecified/private mapped URL을 놓치는 문제
- Backend publish-time server fallback scan이 public `timeline` title/description/status를 검사하지 않는 문제
- Frontend Settings PATCH가 Backend `UserSettingsResponse` 전체를 section state로 저장해 privacy/notification 설정 UI를 깨뜨리는 문제
- Frontend public discovery/profile/search/explore project list가 Backend regression으로 private/unlisted project를 받으면 렌더링할 수 있는 문제

## 변경 사항

### AgentFeed-CLI

- `database_url` scanner가 `rediss://`와 `mongodb+srv://`를 high severity로 redaction합니다.
- private URL scanner가 다음 public draft leak class를 redaction합니다.
  - `127.x.x.x` loopback 전체
  - `0.0.0.0`
  - `100.64.0.0/10` CGNAT
  - IPv6 unspecified `::`
  - IPv4-mapped loopback `::ffff:127.0.0.1`, `::ffff:7f00:1`

### agentfeed-backend

- `_public_scan_fields()`가 `timeline_json`의 `title`, `description`, `status`를 public publish scan 대상에 포함합니다.
- Publish fallback scan finding field는 `timeline.0.description`처럼 구체 경로를 남깁니다.

### agentfeed-frontend

- `me.updatePrivacySettings()`와 `me.updateNotificationSettings()`가 Backend `DataResponse<ApiUserSettings>`에서 section만 unwrap합니다.
- Settings page는 기존처럼 independent partial save를 유지하되, state에는 flat privacy/notification section만 저장합니다.
- `adaptPublicProjectSummaries()`를 추가해 profile/search/explore public project surfaces가 `visibility === "public"` project만 렌더링합니다.

## 검증 증거

> [!success] Full local and cross-repo gates passed
> RED tests를 먼저 확인한 뒤 구현했고, 개별 레포 gate와 `agentfeed-dev ./scripts/test-all.sh`가 모두 통과했습니다.

### RED 확인

- CLI `npm test -- --run tests/privacy.test.ts` → 9개 신규 sensitive URL case 실패 확인
- Backend `pytest -k timeline_when_scan_missing` → timeline secret이 publish gate를 통과하려는 실패 확인
- Frontend `npm run test:contracts` → Settings PATCH response unwrap 실패 확인

### CLI

- `npm test -- --run` → 21 files, 313 tests passed
- `npm run typecheck` → passed
- `npm run release:preflight` → passed
- `npm audit --omit=dev --audit-level=moderate` → found 0 vulnerabilities

### Backend

- `uv run --python 3.12 --locked --group dev ruff check .` → passed
- `uv run --python 3.12 --locked --group dev pytest tests` → 281 passed, 1 warning

### Frontend

- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` → passed
- `npm run lint` → passed
- `npm audit --omit=dev --audit-level=moderate` → found 0 vulnerabilities

### Cross-repo

- `agentfeed-dev ./scripts/test-all.sh` → passed
  - OpenAPI contract gate: 70 operations, 67 client contracts, 22 response field contracts
  - Actions SHA pin gate passed
  - CLI 313 tests/typecheck/release preflight/audit passed
  - Frontend production build/contracts/audit passed
  - Backend 281 tests/ruff/Alembic offline chain passed

## 남은 범위

> [!warning]
> 이 루프는 P1/P2 gap을 닫는 진행 작업입니다. 전체 상용화 완료 선언은 아직 보류합니다.

남은 주요 후보:

- Cross-repo integration gates를 원격 CI/PR에서 강제하는 구조
- OpenAPI gate의 type/required/nullability/request-body contract 강화
- Backend durable audit event table/logger
- Ingestion post-auth token/user quota 분리
- 실제 hosted GitHub OAuth credential 환경에서 CLI approval-code browser happy path manual smoke

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[AgentFeed CLI MOC#핵심 노트]]
- [[Privacy Safety]]
- [[Auth & Credential Safety]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - CLI Approval Code Privacy Fallback and Public Adapter 2026-06-02]]
