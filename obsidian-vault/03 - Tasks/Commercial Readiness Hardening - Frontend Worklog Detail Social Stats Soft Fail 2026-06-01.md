---
title: Commercial Readiness Hardening - Frontend Worklog Detail Social Stats Soft Fail 2026-06-01
aliases:
  - Worklog Detail Social Stats Soft Fail
  - Worklog Detail Missing Social Recovery
  - Frontend Detail Payload Soft Fail
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Frontend Worklog Detail Social Stats Soft Fail 2026-06-01

## 목적

Public worklog detail이 Backend partial deploy나 payload drift로 `social` stats를 누락했을 때, 핵심 worklog content까지 blank/error 처리하지 않고 social count만 안전한 zero fallback으로 렌더링하도록 보강했습니다.

> [!important]
> List surface는 malformed row를 drop할 수 있지만, detail page는 공유/검색/포트폴리오 전환의 primary surface입니다. `id`, `title`, `author` 같은 핵심 필드가 살아 있으면 비핵심 presentation field는 soft-fail해야 합니다.

## 수정 요약

- `adaptWorklog()`의 필수 payload check를 list-card strictness에서 detail-specific check로 분리했습니다.
- Detail payload 필수 조건은 object + usable `id` + usable `title` + usable author identity입니다.
- Missing/null `social`은 기존 `safeSocialStats()` default를 통해 likes/comments/bookmarks `0`으로 처리합니다.
- List adapter는 기존처럼 `social`이 없는 malformed card row를 drop합니다.

## 계약

- Worklog detail missing `social` → page blank 대신 social stats `0` fallback.
- Worklog detail missing/non-object payload → `Malformed worklog payload`로 계속 reject.
- Worklog detail missing author/id/title → author/profile/detail integrity 보장을 위해 계속 reject.
- Worklog list card missing `social` → 기존처럼 row drop.

## TDD 기록

> [!bug] RED
> `api-contract.test.ts`에 detail payload의 missing `social` soft-fail regression을 먼저 추가했고, `npm run test:contracts`가 `Malformed worklog payload`로 실패했습니다.

> [!success] GREEN
> `isUsableWorklogDetail()`을 추가해 detail 필수 필드만 검사하고, social stats는 `safeSocialStats()` fallback을 사용하게 했습니다.

## 검증 증거

- RED:
  - `npm run test:contracts`
  - 결과: expected failure `Error: Malformed worklog payload`
- Frontend targeted/full gates:
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `npm run ci` → typecheck, contract tests, production build passed
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check` → clean
- Cross-repo gate:
  - `agentfeed-dev make test`
  - 결과: OpenAPI contract gate, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 통과

## 남은 리스크

> [!note]
> 실제 Backend가 intentionally `social`을 누락한 live fixture로 hydrated browser QA를 돌리지는 않았습니다. 현재 검증은 adapter contract, production build, cross-repo gate 기준입니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend worklog detail social stats soft-fail]]
- [[Active Tasks#P1 후보]]
