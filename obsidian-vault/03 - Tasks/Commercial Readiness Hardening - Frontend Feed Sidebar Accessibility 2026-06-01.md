---
title: Commercial Readiness Hardening - Frontend Feed Sidebar Accessibility 2026-06-01
aliases:
  - Frontend feed sidebar accessibility hardening
  - 2026-06-01 feed rising builders nested interactive fix
tags:
  - agentfeed/frontend
  - agentfeed/accessibility
  - agentfeed/feed
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - Frontend Feed Sidebar Accessibility 2026-06-01

> [!abstract] 목적
> Feed sidebar의 Rising builders row와 filter dropdown을 상용 UI 접근성 기준에 맞게 보강했습니다. 특히 profile navigation pseudo-button 안에 Follow button이 중첩되는 구조를 제거했습니다.

## 계약

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend feed sidebar accessibility|Integration 계약]]
  - Rising builders row는 더 이상 `role="button"` container 안에 Follow `<button>`을 중첩하지 않습니다.
  - Profile 이동은 별도 `button.builder-profile-button`이 담당하고, Follow는 sibling button으로 유지됩니다.
  - Filter trigger는 `aria-haspopup="listbox"`와 `aria-expanded`를 노출합니다.
  - Filter menu/options는 `role="listbox"`, `role="option"`, `aria-selected`를 노출합니다.

## TDD 기록

> [!failure] RED
> `npm run test:contracts`가 `feed rising-builder profile navigation must be a separate semantic control beside the follow button` 계약에서 실패했습니다.

> [!success] GREEN
> - Rising builders row에서 nested interactive `role="button"` container를 제거했습니다.
> - Profile button / Follow button을 sibling control로 분리했습니다.
> - Builder profile button의 focus-visible ring을 CSS로 고정했습니다.
> - Feed filter dropdown ARIA 상태/option semantics를 추가했습니다.

## 검증 증거

- Frontend targeted/full:
  - `npm run test:contracts`
  - `npm run lint`
  - `npm run ci`
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check`
- Cross-repo gate:
  - `make test` in `agentfeed-dev` → OpenAPI gate passed, CLI 272 tests/typecheck/release preflight/audit passed, Frontend CI/audit passed, Backend ruff/pytest 246 passed/Alembic offline chain passed

## 남은 리스크

> [!warning]
> 실제 스크린리더 reading order와 browser별 listbox keyboard nuance는 정적/source contract와 Next build로 검증했습니다. 수동 AT smoke는 release 전 QA 후보입니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend feed sidebar accessibility]]
- [[Active Tasks#P1 후보]]
