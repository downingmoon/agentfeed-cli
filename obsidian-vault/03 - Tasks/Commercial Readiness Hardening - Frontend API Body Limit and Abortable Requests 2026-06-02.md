---
title: Commercial Readiness Hardening - Frontend API Body Limit and Abortable Requests 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/frontend
  - commercial-readiness
  - hardening
  - p1
status: done
aliases:
  - Frontend API body limit and abortable requests
---

# Commercial Readiness Hardening - Frontend API Body Limit and Abortable Requests 2026-06-02

관련 지도: [[AgentFeed CLI MOC]]  
관련 영역: [[Integration - CLI Backend Frontend]], [[Runtime Configuration]]

## 목표

Frontend API client와 주요 public feed/search 화면이 상용 환경에서 비정상/대용량 응답과 빠른 필터 전환을 더 안전하게 처리하도록 보강한다.

> [!important] Acceptance
> - 대용량 API response body는 JSON.parse 전에 fail-closed 처리한다.
> - caller-provided `AbortSignal`이 `apiFetch`까지 전달된다.
> - `useFeed`와 `SearchPage`는 initial load와 load-more 요청을 cleanup/교체 시 abort한다.
> - `npm run test:contracts`, `npm run lint`, 명시적 API URL 기반 `npm run ci`가 통과한다.

## RED

- `npm run test:contracts`
  - 실패: `oversized API response bodies must fail closed before parsing`
  - 원인: `safeResponseText`가 `res.text()`로 전체 body를 읽고 `parseApiJson`이 크기 제한 없이 JSON.parse 수행.

## 변경

- `src/lib/api.ts`
  - `API_RESPONSE_TEXT_MAX_BYTES = 1_048_576` 추가.
  - `safeResponseText`를 streaming reader 기반으로 변경해 content-length/누적 byte 기준 초과 응답을 `ApiError(502)`로 차단.
  - `feed.list`, `feed.following`, `search.query`에 caller `AbortSignal` 옵션 추가.
- `src/hooks/useFeed.ts`
  - initial feed request와 load-more request에 `AbortController` 적용.
  - params/retry 변경 또는 cleanup 시 stale request abort.
- `src/components/pages/SearchPage.tsx`
  - initial search request와 load-more request에 `AbortController` 적용.
  - query/filter 변경 또는 cleanup 시 stale request abort.
- `src/lib/api-contract.test.ts`
  - oversized body가 JSON.parse 전에 `ApiError(502)`로 차단되는지 검증.
  - `feed.list(..., { signal })` cancellation propagation 검증.
- `src/lib/page-source-contract.test.ts`
  - `useFeed`/`SearchPage` abort wiring source contract 추가.

## GREEN / Evidence

- [x] `npm run test:contracts` 통과
- [x] `npm run lint` 통과 (`tsc --noEmit`)
- [x] `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` 통과

> [!note]
> `npm run ci`는 production build API URL fail-closed 정책 때문에 `NEXT_PUBLIC_API_URL` 없이는 실패하는 것이 정상이다.

## 남은 외부 검증

- Hosted DNS/deployment smoke와 credentialed GitHub OAuth live happy path는 외부 배포/자격 증명 상태에 의존한다.
