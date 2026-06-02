---
title: Commercial Readiness Hardening - Settings Notifications and API Base Parity 2026-06-02
aliases:
  - Settings notification controls parity
  - Dev API base parity gate
  - Notification settings API UI parity
  - Frontend CLI API split-brain gate
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/dev-smoke
  - agentfeed/runtime-config
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - Settings Notifications and API Base Parity 2026-06-02

> [!success] 목표
> Backend가 제공하는 모든 notification preference를 Frontend Settings에서 사용자가 제어할 수 있게 하고, dev release-readiness gate가 Frontend와 CLI가 같은 Backend를 바라보는지 fail-closed로 검증하게 합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P1 후보]]
- 통합 기준: [[Integration - CLI Backend Frontend#2026-06-02 settings notification controls and API base parity]]
- 런타임 설정 영역: [[Runtime Configuration]]
- 선행 설정 hardening: [[Commercial Readiness Hardening - Settings Privacy Controls 2026-05-31]]

## 변경 범위

### Frontend notification settings parity

- `agentfeed-frontend/src/components/pages/SettingsPage.tsx`
  - `notifications.worklog_like` 토글 추가.
  - `notifications.prompt_bookmark` 토글 추가.
  - `notifications.new_worklog_from_following` 토글 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Settings page가 Backend `ApiNotificationSettings`의 누락된 3개 필드를 렌더링/저장 payload에 포함하는지 고정.
  - 사용자-visible labels: `Worklog like notifications`, `Prompt bookmark notifications`, `Following author worklogs`.

### Dev API base parity gate

- `agentfeed-dev/scripts/check-api-base-parity.sh`
  - `NEXT_PUBLIC_API_URL`과 `AGENTFEED_API_BASE_URL`을 normalize.
  - CLI base가 Frontend API root + `/v1`과 다르면 `must point at the same backend` 메시지로 실패.
- `agentfeed-dev/scripts/test-api-base-parity.sh`
  - mismatch case: `http://localhost:8000` vs `http://localhost:8001/v1` 실패를 검증.
  - aligned local/trailing-slash/hosted cases 통과를 검증.
- `agentfeed-dev/scripts/test-all.sh`
  - parity scripts syntax, behavior, static markers를 full cross-repo gate에 편입.
- `agentfeed-dev/README.md`
  - Frontend는 Backend root, CLI는 같은 root + `/v1`을 써야 한다는 설정 계약 명시.

## 고정된 계약

- Backend schema에 존재하는 notification setting은 사용자 Settings UI에서도 모두 제어 가능해야 합니다.
- Settings save는 기존 `me.updateNotificationSettings(notifications)` 경로를 유지하므로 새 토글 값도 같은 payload에 포함됩니다.
- `agentfeed-dev make test`는 Frontend와 CLI가 서로 다른 Backend/port/API version을 보는 split-brain configuration을 통과시키면 안 됩니다.

## 검증 증거

- RED: `npm run test:contracts` 실패.
  - 실패 원인: `settings page must render and save worklog-like notification toggle`.
- GREEN: `npm run test:contracts && npm run lint` 통과.
- GREEN: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` 통과.
  - Typecheck, contract tests, production build passed.
- GREEN: `npm audit --audit-level=high` 통과.
  - found 0 vulnerabilities.
- RED: `./scripts/test-api-base-parity.sh` 실패.
  - 실패 원인: `scripts/check-api-base-parity.sh`가 아직 없어 mismatch/aligned parity contract를 검증할 수 없었음.
- GREEN: `bash -n scripts/check-api-base-parity.sh && bash -n scripts/test-api-base-parity.sh && ./scripts/test-api-base-parity.sh && grep -q "same Backend root" README.md && git diff --check` 통과.
- GREEN: `agentfeed-dev ./scripts/test-all.sh` 통과.
  - New `api-base parity tests passed` marker observed.
  - AgentFeed OpenAPI contract gate passed.
  - CLI: 21 test files / 314 tests passed, typecheck passed, release preflight passed, dependency audit found 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, dependency audit passed.
  - Backend: ruff passed, 284 tests passed, Alembic offline migration chain generated through `019_audit_events`.

## 후속 후보

> [!todo]
> Subagent audit가 `agentfeed open`의 split API/review host deployment gap을 발견했습니다. 다음 P1 후보: CLI `open`이 `AGENTFEED_REVIEW_BASE_URL` 같은 명시적 review frontend allowlist를 지원해 API와 Frontend가 다른 host인 self-hosted/enterprise 배포에서도 안전하게 review URL을 열 수 있게 하기.

## 남은 리스크

> [!warning]
> 이번 parity gate는 dev/release-readiness config의 Frontend root와 CLI `/v1` base 정렬을 검증합니다. 실제 production 배포에서 API와 review frontend host가 의도적으로 분리되는 케이스는 후속 CLI review host allowlist 작업으로 별도 지원해야 합니다.
