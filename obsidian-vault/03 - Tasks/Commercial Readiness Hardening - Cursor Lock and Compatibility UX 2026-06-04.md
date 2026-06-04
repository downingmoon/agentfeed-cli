---
title: Commercial Readiness Hardening - Cursor Lock and Compatibility UX 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - hardening
status: completed
created: 2026-06-04
aliases:
  - Cursor lock and compatibility UX hardening
---

# Commercial Readiness Hardening - Cursor Lock and Compatibility UX 2026-06-04

## 목적

상용화 안정성 관점에서 이번 배치는 세 가지 작은 장애 모드를 줄였다.

> [!important]
> 핵심 방향은 “실패해도 안전하고, 운영자가 원인을 바로 볼 수 있고, 사용자에게 활성처럼 보이는 불가능한 액션을 없애는 것”이다.

## 변경 요약

### CLI upload lock diagnostics

- `agentfeed-cli/src/api/client.ts`
  - `DRAFT_UPLOAD_LOCKED` 오류에 draft id, lock path, wait time, stale threshold, owner pid, created/heartbeat timestamp, lock fingerprint를 포함한다.
  - raw lock token 또는 raw `token_hash`는 오류 details에 노출하지 않는다.
  - 충돌 메시지에 rerun/lock cleanup 기준을 명확히 안내한다.
- `agentfeed-cli/tests/api-hook.test.ts`
  - active lock과 heartbeat-current lock에서 진단 details가 포함되는지 검증.
  - lock fingerprint만 노출되고 raw hash가 누출되지 않는지 검증.

### Backend cursor hard fail 방지

- `agentfeed-backend/app/utils/cursor.py`
  - cursor JSON top-level이 object/dict가 아니면 `None`으로 처리한다.
  - base64 decode 자체는 성공했지만 JSON number/list/string인 토큰이 keyset/feed endpoint에서 500으로 번지는 일을 막는다.
- `agentfeed-backend/tests/test_contracts.py`
  - `decode_cursor`, `decode_datetime_id_cursor`, feed aggregate cursor에 non-dict payload를 추가.

### Frontend compatibility mismatch UX

- `agentfeed-frontend/src/components/layout/Header.tsx`
  - `apiCompatibilityError` 중에는 Header의 `Sign in` / `Get started` 버튼도 disabled 처리한다.
  - tooltip/title도 compatibility mismatch 원인을 표시한다.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Header가 API compatibility failure를 소비하고 fail-closed하는 계약을 고정한다.

## 검증

> [!success] Fresh local verification
> - CLI: `npm run build && npm test -- --run && npm run typecheck && npm run release:preflight && npm audit --audit-level=high` ✅ `396 passed`, `0 vulnerabilities`
> - Backend: `uv run ruff check . && uv run pytest -q` ✅ `386 passed, 1 warning`
> - Frontend: `npm run test:contracts && npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` ✅

## 남은 외부 차단 조건

> [!failure]
> 상용 hosted readiness는 아직 외부 인프라 상태 때문에 완료로 볼 수 없다.
> - `api.agentfeed.dev` DNS lookup: `ENOTFOUND`
> - `https://agentfeed.dev/` root: `307 /login`

## 관련 노트

- [[Commercial Readiness Hardening - CLI Upload Lock Heartbeat Failure 2026-06-04]]
- [[Commercial Readiness Hardening - Backend Me Card Hydration Batching 2026-06-04]]
- [[Commercial Readiness Hardening - Frontend Hosted Readiness Required 2026-06-04]]
- [[Active Tasks]]
