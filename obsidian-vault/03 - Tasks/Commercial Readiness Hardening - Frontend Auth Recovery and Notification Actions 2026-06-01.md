---
title: Commercial Readiness Hardening - Frontend Auth Recovery and Notification Actions 2026-06-01
aliases:
  - Frontend auth recovery and notification action hardening
  - 2026-06-01 notifications nested interactive fix
  - 2026-06-01 auth unavailable retry UI
tags:
  - agentfeed/frontend
  - agentfeed/accessibility
  - agentfeed/auth
  - agentfeed/notifications
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - Frontend Auth Recovery and Notification Actions 2026-06-01

> [!abstract] 목적
> Dashboard/Notifications의 auth/API bootstrap 실패 상태를 사용자가 복구할 수 있는 UI로 바꾸고, Notifications row의 Link 안에 `Read` button이 중첩되던 invalid interactive 구조를 제거했습니다.

## 계약

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend auth recovery and notification actions|Integration 계약]]
  - App shell auth unavailable banner는 hard refresh 없이 `auth.me()`를 다시 실행하는 retry action을 제공합니다.
  - Dashboard와 Notifications는 `authError`뿐 아니라 `apiConfigError`도 명시적 recovery branch로 처리합니다.
  - Notifications는 signed-out redirect 상태를 loading spinner로 오인시키지 않고 별도 메시지를 렌더링합니다.
  - Notification row는 non-interactive wrapper를 사용하고, navigation Link와 `Read` button은 sibling controls입니다.
  - Notification read / mark-all-read actions는 duplicate submission을 pending state로 잠급니다.

## TDD 기록

> [!failure] RED
> `npm run test:contracts`가 `dashboard auth/API bootstrap failures must share an explicit recovery branch` 계약에서 실패했습니다.

> [!success] GREEN
> - `AppProvider`의 auth bootstrap을 `retryAuthCheck` callback으로 추출하고 banner retry button에 연결했습니다.
> - Dashboard/Notifications에 `authRecoveryError = authError ?? apiConfigError` branch와 reload recovery CTA를 추가했습니다.
> - Notifications의 Link-wrapped row를 `notification-row` wrapper + `notification-link` + sibling `Read` button 구조로 변경했습니다.
> - `readPending` / `markAllPending` 상태와 `aria-busy`를 추가했습니다.

## 검증 증거

- Frontend targeted:
  - `npm run test:contracts`
  - `npm run lint`
- Frontend full:
  - `npm run ci`
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check`
- Cross-repo gate:
  - `make test` in `agentfeed-dev` → OpenAPI gate passed, CLI 272 tests/typecheck/release preflight/audit passed, Frontend CI/audit passed, Backend ruff/pytest 246 passed/Alembic offline chain passed

## Sidecar 판단

> [!warning]
> Backend sidecar scan은 DB rate-limit store 장애 시 fail-open fallback을 제안했습니다. 현재 AgentFeed는 이전 상용화 hardening에서 production rate-limit store 장애를 fail-closed/observable degraded mode로 확정했으므로 이번 slice에서는 정책을 바꾸지 않았습니다.

## 남은 리스크

> [!warning]
> 실제 screen-reader reading order와 notification row keyboard UX는 정적/source contract와 build gate로 검증합니다. 수동 AT smoke는 release 전 QA 후보입니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend auth recovery and notification actions]]
- [[Active Tasks#P1 후보]]
