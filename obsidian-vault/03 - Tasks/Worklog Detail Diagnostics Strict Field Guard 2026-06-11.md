---
title: Worklog Detail Diagnostics Strict Field Guard
date: 2026-06-11
tags:
  - agentfeed/contracts
  - frontend
  - backend
  - verification
status: done
---

# Worklog Detail Diagnostics Strict Field Guard

## 요약

Backend `GET /v1/worklogs/{worklog_id}`와 WorklogCard 계열 응답은 `diagnostics` 필드를 포함할 수 있고, Pydantic response model은 unexpected field를 금지한다. Frontend detail/card normalizer가 이 계약을 동일하게 따르도록 `diagnostics` 보존과 strict-field guard를 추가했다.

## 발견한 불일치

- Backend detail route는 author viewer에게 legacy outcome/timeline 정규화 결과를 `diagnostics.normalization`으로 내려보낸다.
- Backend `Worklog` / `WorklogCard` / nested diagnostics/social/viewer/outcome/timeline 모델은 extra field를 금지한다.
- Frontend는 기존에 `diagnostics`를 타입/normalizer에서 누락했고, detail/card top-level 및 일부 nested 객체의 extra field를 거부하지 않았다.

## 변경 내용

- `agentfeed-frontend/src/lib/api-worklog-diagnostics.ts`
  - `ApiWorklogDiagnostics`, `ApiWorklogNormalizationDiagnostics` 타입 추가.
  - `diagnostics`, `diagnostics.normalization` unexpected field를 fail-closed 처리.
- `agentfeed-frontend/src/lib/api-worklog-card.ts`
  - `diagnostics`를 보존.
  - Backend `WorklogCard` 필드셋 기준으로 top-level unexpected field를 거부.
- `agentfeed-frontend/src/lib/api-worklog-detail.ts`
  - Backend `Worklog` 필드셋 기준으로 top-level unexpected field를 거부.
  - `outcome[]`, `timeline[]` unexpected field를 거부.
  - `diagnostics`를 detail 응답에도 보존.
- `agentfeed-frontend/src/lib/api-worklog-social-state.ts`
  - `social`, `viewer_state` unexpected field를 거부.
- `agentfeed-frontend/src/lib/worklog-detail-strict-fields.contract.test.ts`
  - `worklogs.get`이 diagnostics를 보존하는지 확인.
  - detail/card raw/private/admin extra field가 `ApiError(502)`로 차단되는지 확인.
- `agentfeed-frontend/scripts/run-contract-tests.mjs`
  - 새 계약 테스트를 전체 contract suite에 포함.

## 검증

- Frontend
  - `npm run test:contracts` 통과
  - `npm run lint` 통과 (`tsc --noEmit`)
  - `npm test` 통과
- Backend
  - `uv run pytest tests/test_worklog_response_model_contracts.py tests/test_worklog_public_detail_contracts.py tests/test_route_response_model_contracts.py` 통과: 12 passed
- CLI
  - `npm test -- tests/api-client-json-boundary.test.ts` 통과
- LOC 점검
  - `src/lib/api-worklog-diagnostics.ts`: 51 pure LOC
  - `src/lib/api-worklog-card.ts`: 105 pure LOC
  - `src/lib/api-worklog-detail.ts`: 132 pure LOC
  - `src/lib/api-worklog-social-state.ts`: 42 pure LOC
  - `src/lib/worklog-detail-strict-fields.contract.test.ts`: 136 pure LOC
  - `scripts/run-contract-tests.mjs`: 118 pure LOC

> [!info]
> LSP diagnostics는 로컬 `typescript-language-server`가 설치되어 있지 않아 실행하지 못했다. 동일 범위의 타입 검증은 Frontend `npm run lint`의 `tsc --noEmit`로 통과 확인했다.

## 후행 과제

- Privacy scan 객체와 finding 객체도 Backend `extra="forbid"`와 Frontend normalizer의 unexpected-field 처리 방식이 완전히 일치하는지 다음 slice에서 별도로 감사한다.
