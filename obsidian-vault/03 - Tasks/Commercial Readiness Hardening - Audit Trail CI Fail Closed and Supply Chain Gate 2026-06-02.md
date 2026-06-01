---
title: Commercial Readiness Hardening - Audit Trail CI Fail Closed and Supply Chain Gate 2026-06-02
aliases:
  - Audit trail CI fail closed supply chain hardening
  - 2026-06-02 audit trail CI hardening
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/audit
  - agentfeed/security
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-02
updated: 2026-06-02
---

# Commercial Readiness Hardening - Audit Trail CI Fail Closed and Supply Chain Gate 2026-06-02

## 목적

> [!important]
> 상용 운영에서 문제가 나중에 드러나는 영역을 fail-closed로 바꿨습니다: Backend sensitive action durable audit trail, Frontend production API URL CI 명시화, CLI npm release/build/supply-chain gate.

닫은 위험:

- Backend에서 token issuance/rotation/revocation, CLI browser auth approve/exchange, logout, publish/unpublish, privacy finding resolution 같은 민감 이벤트가 DB에 durable하게 남지 않음
- Frontend GitHub CI가 `NEXT_PUBLIC_API_URL` 누락을 script default로 숨겨 배포 API misconfig를 통과시킬 수 있음
- CLI release CI가 test side effect build에 의존하고, release/build dependency graph 전체 audit을 강제하지 않음
- 새 full dependency audit에서 실제 `vitest <4.1.0` critical advisory가 드러남

## 변경 사항

### AgentFeed-CLI

- CI workflow에 명시적 `npm run build` step을 추가해 release preflight가 test side effect에 의존하지 않도록 했습니다.
- CI와 Release workflow 모두 `npm audit --audit-level=high`로 full dependency graph를 검사합니다.
- `release-preflight`가 release workflow의 full audit step, audit-before-build/publish order, `--omit=dev` 금지를 검증합니다.
- `vitest`를 `^4.1.8`로 올려 critical dev dependency advisory를 제거했습니다.
- command-wrapper refusal test가 반복 command path 때문에 5초 기본 timeout에 걸릴 수 있어 해당 security test만 `15_000ms`로 안정화했습니다.

### agentfeed-backend

- `audit_events` 모델과 Alembic migration `019_audit_events`를 추가했습니다.
- `record_audit_event()` service를 추가해 sensitive metadata key/value를 저장 전에 redaction합니다.
- audit metadata는 raw ingestion token, verifier, approval code, hash, secret-like provider token을 저장하지 않습니다.
- 다음 이벤트를 같은 transaction에 ORM add합니다.
  - `auth.logout`
  - `cli_auth_session.approved`
  - `cli_auth_session.exchanged`
  - `ingestion_token.created`
  - `ingestion_token.rotated`
  - `ingestion_token.revoked`
  - `worklog.privacy_finding.resolved`
  - `worklog.published`
  - `worklog.unpublished`
- `IngestionToken` 생성 시 app-side UUID를 명시해 audit target id를 commit 전에도 안정적으로 참조합니다.

### agentfeed-frontend

- `scripts/run-ci.mjs`가 production build용 `NEXT_PUBLIC_API_URL` 누락 시 즉시 실패합니다.
- Hosted default `https://api.agentfeed.dev`는 `AGENTFEED_CI_ALLOW_DEFAULT_API=1`일 때만 intentional smoke fallback으로 허용합니다.
- GitHub Actions CI workflow가 `NEXT_PUBLIC_API_URL: https://api.agentfeed.dev`를 명시합니다.
- Source contract가 CI runner와 workflow를 같이 검사해 silent default 회귀를 막습니다.

## 검증 증거

> [!success] Full local and cross-repo gates passed
> RED tests를 먼저 확인한 뒤 구현했고, 개별 레포 gate와 `agentfeed-dev ./scripts/test-all.sh`가 모두 통과했습니다.

### RED 확인

- CLI `npm test -- --run tests/release-preflight.test.ts` → release workflow audit step 누락과 CI build/audit gate 누락으로 실패 확인
- Frontend `npm run test -- src/lib/page-source-contract.test.ts` → `AGENTFEED_CI_ALLOW_DEFAULT_API` / required API URL contract 누락으로 실패 확인
- Backend `uv run pytest -q tests/test_contracts.py -k "audit_event or create_ingestion_token_issues or cli_auth_exchange_issues or cli_auth_exchange_rotates or rotate_managed_ingestion_token_uses_existing_name or publish_records_safe_server_privacy_scan or unpublish_defaults"` → AuditEvent/model/service/route emission 부재로 8개 실패 확인
- CLI full `npm audit --audit-level=high` → `vitest <4.1.0` critical advisory 확인

### CLI

- `npm test -- --run` → 21 files, 314 tests passed
- `npm run typecheck` → passed
- `npm run build` → passed
- `npm run release:preflight` → passed
- `npm audit --audit-level=high` → found 0 vulnerabilities

### Backend

- `uv run pytest -q` → 283 passed, 1 warning
- `uv run ruff check app tests` → All checks passed
- `uv run alembic upgrade head --sql` → migration chain includes `018_cli_auth_session_approval_code -> 019_audit_events`

### Frontend

- `env -u NEXT_PUBLIC_API_URL -u AGENTFEED_CI_ALLOW_DEFAULT_API node scripts/run-ci.mjs` → expected fail with `NEXT_PUBLIC_API_URL is required for CI production builds.`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` → typecheck/contracts/production build passed
- `npm audit --omit=dev --audit-level=moderate` → found 0 vulnerabilities

### Cross-repo

- `agentfeed-dev ./scripts/test-all.sh` → passed
  - OpenAPI contract gate: 70 operations, 67 client contracts, 22 response field contracts
  - Actions SHA pin gate passed
  - CLI 314 tests/typecheck/release preflight/full audit passed
  - Frontend production build/contracts/audit passed
  - Backend 283 tests/ruff/Alembic offline chain passed

## 운영상 의미

> [!tip]
> 이번 변경은 사용자 기능보다 운영 안전망입니다. 장애/오용 발생 후 누가 어떤 민감 작업을 했는지 추적할 수 있고, CI가 production config와 supply-chain drift를 숨기지 않습니다.

상용화에 가까워진 점:

- Sensitive lifecycle action의 auditability 확보
- Release/build dependency audit 범위 확대와 실제 critical advisory 제거
- Frontend deploy config misconfiguration을 remote CI에서 fail-fast
- Cross-repo gate가 새 Backend migration과 CLI/Frontend CI 정책을 함께 검증

## 남은 범위

> [!warning]
> 이 루프는 상용화 리스크를 더 줄인 진행 작업입니다. 전체 상용화 완료 선언은 아직 보류합니다.

남은 주요 후보:

- Cross-repo integration gate를 remote CI/PR 필수 check로 강제
- OpenAPI gate의 type/required/nullability/request-body contract 강화
- Ingestion post-auth token/user quota 분리와 quota audit surface 확장
- Hosted GitHub OAuth credential 환경에서 approval-code browser happy path manual/live smoke
- AuditEvent viewer/admin export policy와 retention policy 정의

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[AgentFeed CLI MOC#핵심 노트]]
- [[Integration - CLI Backend Frontend]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Privacy Safety]]
- [[Commercial Readiness Hardening - Public Timeline Settings and URL Privacy 2026-06-02]]
