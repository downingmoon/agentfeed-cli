---
title: Commercial Readiness Hardening - Frontend Worklog Detail Retry Safety 2026-06-01
aliases:
  - Worklog Detail Retry Safety
  - Malformed Worklog Detail Recovery
  - Frontend Worklog Detail Partial Failure
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Frontend Worklog Detail Retry Safety 2026-06-01

## 목적

Public worklog detail 화면이 Backend partial deploy나 malformed successful payload를 만났을 때 런타임 crash/blank 상태로 끝나지 않고, 안전한 오류 메시지와 in-place retry를 제공하도록 고정했습니다.

> [!important]
> Worklog detail의 primary request는 `useWorklog(worklogId)`가 소유합니다. Comment list 같은 secondary data failure는 primary detail을 지우지 않고 section-level error로만 표시합니다.

## 수정 요약

- `useWorklog()`에 `reloadKey` 기반 `retryWorklog()`를 추가했습니다.
- `adaptWorklog()`의 `Malformed worklog payload` 오류는 사용자에게 안전한 retryable copy로 변환합니다.
- Worklog detail error state에 `Retry loading worklog` 버튼을 추가해 route 이동 없이 같은 id를 다시 요청합니다.
- `page-source-contract`가 primary detail retry, malformed payload safe message, comments secondary failure isolation을 고정합니다.

## 계약

- malformed primary detail payload는 render crash가 아니라 error state로 전환합니다.
- retry는 현재 `worklogId`를 유지하고 `reloadKey`만 변경해 재요청합니다.
- comment load/add/report failure는 primary worklog content를 blank 처리하지 않습니다.
- Back to feed는 fallback navigation이고, 첫 번째 복구 행동은 in-place retry입니다.

## TDD 기록

> [!bug] RED
> `src/lib/page-source-contract.test.ts`에 worklog detail retry 계약을 먼저 추가했고, `npm run test:contracts`가 `worklog detail hook must keep an explicit retry trigger for the current worklog id`로 실패했습니다.

> [!success] GREEN
> `useWorklog()`에 explicit retry trigger를 추가하고, `WorklogDetailPage` error state에 retry CTA를 연결한 뒤 contract test가 통과했습니다.

## 검증 증거

- RED:
  - `npm run test:contracts`
  - 결과: expected failure `worklog detail hook must keep an explicit retry trigger for the current worklog id`
- Frontend targeted/full gates:
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `git diff --check` → clean
  - `npm run ci` → typecheck, contract tests, production build passed
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
- Cross-repo gate:
  - `agentfeed-dev make test`
  - 결과: OpenAPI contract gate, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 통과

## 남은 리스크

> [!note]
> 실제 브라우저에서 Backend가 deliberately malformed detail JSON을 반환하는 hydrated 시나리오는 별도 e2e fixture로 실행하지 않았습니다. 현재 검증은 source contract와 production build/통합 gate 기준입니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend worklog detail retry safety]]
- [[Active Tasks#P1 후보]]
