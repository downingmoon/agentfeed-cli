---
title: Frontend CSP Style Inline Hardening
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/security
  - agentfeed/csp
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# Frontend CSP Style Inline Hardening

> [!success]
> Frontend production CSP에서 broad `style-src 'unsafe-inline'` 허용을 제거하고, 현재 React inline `style` attribute 호환성은 `style-src-attr`로 격리했습니다.

## 배경

병렬 Frontend risk scan에서 `src/lib/security-headers.ts`의 CSP가 `style-src 'unsafe-inline'`을 포함해 production style injection surface가 넓다고 확인했습니다.

현재 UI는 React inline `style={ ... }` attribute를 많이 사용하므로 즉시 모든 inline style을 제거하면 화면 동작이 깨질 수 있습니다. 따라서 이번 slice는 CSP 범위를 분리해 위험한 style element/source fallback을 먼저 줄이는 방향으로 진행했습니다.

## 변경 사항

- `src/lib/security-headers.ts`
  - `style-src`에서 `'unsafe-inline'` 제거.
  - stylesheet element는 `style-src-elem 'self' 'nonce-...' https://fonts.googleapis.com`로 분리.
  - 기존 React inline style attribute 호환성은 `style-src-attr 'unsafe-inline'`로 한정.
- `src/lib/api-contract.test.ts`
  - `style-src`에 `'unsafe-inline'`이 들어가면 contract가 실패하도록 고정.
  - `style-src-elem` nonce와 Google Fonts stylesheet source를 고정.
  - `style-src-attr`가 inline attribute 예외의 유일한 위치임을 고정.

## Regression contract

> [!example]
> 새 contract는 구현 전 `Content-Security-Policy must include style-src-elem`로 먼저 실패했고, 구현 후 통과했습니다.

계약:

- `style-src`는 broad `'unsafe-inline'`을 포함하지 않습니다.
- future inline `<style>`이 필요하면 nonce가 있는 `style-src-elem` 경로를 사용해야 합니다.
- existing React inline `style` attribute는 `style-src-attr`에만 격리합니다.
- script CSP는 기존처럼 nonce + strict-dynamic을 유지하고 `'unsafe-inline'`을 허용하지 않습니다.

## 검증 증거

> [!example] Frontend
> - `npm run test:contracts` → failed first on the new CSP contract
> - `npm run test:contracts` → passed after implementation
> - `npm run lint` → passed
> - `git diff --check` → passed
> - `npm run ci` → passed

> [!example] Cross-repo
> - `make test` in `agentfeed-dev` → passed
> - OpenAPI operations checked: 69
> - Client contracts checked: 66 (`cli`: 6, `frontend`: 60)
> - AgentFeed CLI tests: 264 passed
> - Frontend CI/build/audit gate passed
> - Backend pytest: 226 passed, 1 warning
> - Alembic offline migration chain generated successfully

## 남은 리스크

> [!warning]
> `style-src-attr 'unsafe-inline'`은 기존 React inline style attribute를 보존하기 위한 제한적 호환성 예외입니다. 완전한 style hardening을 위해서는 주요 page/component inline style을 CSS class 또는 CSS module로 단계적으로 이동해야 합니다.

## 관련 링크

- [[Commercial Readiness Hardening - Frontend CSP and Backend Readiness 2026-06-01]]
- [[Commercial Readiness Hardening - CLI Credential Fallback Fail Closed 2026-06-01]]
- [[Integration - CLI Backend Frontend]]
- [[Active Tasks]]
