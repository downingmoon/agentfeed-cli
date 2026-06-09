---
title: Frontend Notification Action Error Detail
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/error-handling
  - contracts
status: done
related:
  - [[Frontend Social Action Error Detail 2026-06-09]]
---

# Frontend Notification Action Error Detail 2026-06-09

> [!success] 완료
> Notifications 화면의 읽음 처리 / 전체 읽음 처리 실패가 더 이상 고정 문구만 보여주지 않고, API·네트워크·런타임 오류의 구체적인 원인을 사용자에게 함께 노출하도록 개선했다.

## 변경 사항

- `src/components/pages/NotificationsPage.tsx`
  - `ApiError`를 명시적으로 처리해 API가 제공하는 사용자 표시 메시지를 보존.
  - `TypeError` 네트워크 실패는 연결 확인 안내를 표시.
  - 일반 `Error.message`는 최대 160자로 제한해 과도한 내부 문자열 노출을 줄이면서 원인을 표시.
  - 기존 optimistic read 처리와 실패 시 목록 재동기화 흐름은 유지.
- `src/lib/page-source-contract.test.ts`
  - 알림 mutation 실패가 고정 문구만 사용하지 않고 `notificationActionFailureMessage`를 통해 상세 원인을 보존하는지 소스 계약으로 잠금.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- src/lib/page-source-contract.test.ts src/lib/api-contract.test.ts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- Frontend contract/source tests: 통과
- Frontend typecheck/lint: 통과
- Dev OpenAPI contract gate: 통과

## 배포 메모

> [!info]
> 사용자 요청에 따라 이번 작업 완료 후 개인서버 배포를 1회 진행한다.

## 남은 확인

- 실제 브라우저에서 알림 읽음 API를 실패시키는 E2E fault-injection은 이번 국소 변경 범위에서는 수행하지 않았다.
- 추후 Playwright/API mocking 기반으로 notification mutation failure UX 회귀 테스트를 추가할 수 있다.
