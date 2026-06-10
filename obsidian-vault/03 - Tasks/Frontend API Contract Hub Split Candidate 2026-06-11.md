---
title: Frontend API Contract Hub Split Candidate 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - api-contract
  - refactor-candidate
  - enterprise-readiness
status: todo
related:
  - "[[Frontend Privacy Finding Resolution Contract Guard 2026-06-11]]"
---

# Frontend API Contract Hub Split Candidate 2026-06-11

## 배경

Enterprise-readiness contract audit 중 Frontend API 계약 파일이 과도하게 커져 있음을 재확인했다.

현재 pure LOC 기준:

- `src/lib/api.ts`: 약 2700 LOC
- `src/lib/api-contract.test.ts`: 약 5200 LOC
- `src/lib/page-source-contract.test.ts`: 약 1190 LOC

이 파일들은 이미 동작을 잘 잠그는 역할을 하지만, 신규 contract mismatch 수정 시 작은 변경도 대형 파일을 계속 건드리게 되어 리뷰 비용과 회귀 위험이 커진다.

## 권장 분리 방향

- `api.ts`
  - 인증/session client
  - worklog card/detail/review client
  - privacy finding / privacy scan contract parser
  - project/settings/notification client
  - 공통 envelope/error/normalizer
- `api-contract.test.ts`
  - worklog card/detail/review contract tests
  - privacy action contract tests
  - project/settings/auth contract tests
  - pagination/envelope contract tests
- `page-source-contract.test.ts`
  - API contract source guards
  - page-level source guards
  - component-specific source guards

## 진행 조건

> [!warning]
> 이 작업은 behavior-preserving refactor여야 하며 신규 기능을 추가하지 않는다.

1. 현재 `npm test` / `npm run lint` 통과 상태에서 시작한다.
2. 한 번에 전부 나누지 말고, privacy/worklog review처럼 응집도 높은 단위부터 분리한다.
3. 각 slice마다 red/green이 아니라 **기존 테스트 그대로 통과**를 기준으로 한다.
4. 분리 후에도 기존 public import surface를 깨지 않도록 barrel export를 유지한다.

## 상태

현재는 todo. 이번 slice에서는 contract mismatch 수정이 우선이라 분리는 진행하지 않았다.
