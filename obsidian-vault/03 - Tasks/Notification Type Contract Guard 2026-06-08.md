---
title: Notification Type Contract Guard 2026-06-08
aliases:
  - Notification Type Contract Guard
status: completed
tags:
  - agentfeed/todo
  - agentfeed/contract
  - agentfeed/backend
  - agentfeed/frontend
created: 2026-06-08
updated: 2026-06-08
---

# Notification Type Contract Guard 2026-06-08

## 목적

Notification list API에서 `type`과 `target.type`이 broad `string`으로 열려 있어, Backend DB/생성 boundary 또는 Frontend adapter가 unknown notification 값을 조용히 UI까지 전달할 수 있는 contract drift를 제거했다.

> [!success] 완료 판정
> Backend response schema, notification creation boundary, Frontend API type/parser, Frontend source/API contract tests가 같은 closed notification value set을 공유하도록 고정했다.

## 변경 내용

- Backend `app.schemas.notification.Notification.type`
  - broad `str` → `app.enums.NotificationType`.
- Backend `app.schemas.notification.NotificationTarget.type`
  - broad `str` → `NotificationTargetType = Literal["worklog", "comment", "user"]`.
- Backend `app.services.notification.create_notification`
  - 생성 시 `NotificationType`/known string만 허용.
  - `target_type`도 `worklog/comment/user`만 허용.
  - 잘못된 내부 호출은 `ValueError`로 빠르게 실패한다.
- Frontend `src/lib/api.ts`
  - `ApiNotificationType` union 추가.
  - `ApiNotificationTargetType` union 추가.
  - `ApiNotification.type`에서 `| string` fallback 제거.
  - Notification list normalizer가 `requireOneOfForContract`로 unknown `type`/`target.type`을 fail-closed 처리.
- Frontend contract tests
  - malformed notification type/target type 응답 reject 케이스 추가.
  - source guard로 union/parser 재오픈 방지.

## 검증

- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_notification_response_contract_rejects_unknown_types`
  - `uv run ruff check app/schemas/notification.py app/services/notification.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest`: 411 passed, 1 warning
  - `uv run ruff check .`: passed
- Frontend:
  - `npm run test:contracts`: passed
  - `npm run lint`: passed
- CLI:
  - `npm run release:preflight`: 27 files, 568 tests passed

## 후행 과제

> [!note]
> 이번 변경은 신규 notification 기능 추가가 아니라 existing notification payload contract hardening이다.

- 향후 notification 종류를 추가할 때는 Backend `NotificationType`, Frontend `ApiNotificationType`, notification title/href handling, contract tests를 같은 변경 단위로 갱신해야 한다.
- Notification target이 `project` 등으로 확장되어야 한다면 신규 기능으로 보고 별도 Obsidian task/spec에서 먼저 결정한다.

## 관련 문서

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Frontend UI API Boundary Guard 2026-06-08]]
