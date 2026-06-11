---
title: Read Side Strict Field Guards 2026-06-11
tags:
  - agentfeed
  - contracts
  - frontend
  - verification
status: done
created: 2026-06-11
---

# Read Side Strict Field Guards 2026-06-11

## 목적

Backend의 작은 read-side 응답 모델 중 `extra="forbid"`를 쓰는 모델이 Frontend에서 extra field를 조용히 허용하지 않도록 맞췄다. 이번 슬라이스는 신규 기능이 아니라 CLI-API-Frontend 계약 일치도를 높이는 boundary hardening이다.

## Backend 기준

- `app/schemas/user.py`
  - `UserActivityResponse(extra="forbid")`
  - `UserActivityDay(extra="forbid")`
- `app/schemas/integration.py`
  - `IntegrationStatus(extra="forbid")`

## 변경 사항

- Frontend `src/lib/api-activity.ts`
  - Activity response 허용 필드: `from`, `to`, `days`.
  - Activity day 허용 필드: `date`, `sessions`, `tokens_used`, `public_worklogs`.
  - top-level/day item extra field를 `activity response contract mismatch`로 fail-closed 처리.
- Frontend `src/lib/api-integration-status.ts`
  - Integration status 허용 필드: `type`, `status`, `connected_at`.
  - item extra field를 `integration status response contract mismatch`로 fail-closed 처리.
- Frontend `src/lib/read-side-strict-fields.contract.test.ts`
  - 기존 거대 `api-contract.test.ts`를 더 키우지 않기 위해 focused contract test로 추가.
  - Activity top-level `debug`, Activity day `raw_tokens`, Integration status `raw_secret`가 거부되는지 확인.
- Frontend `scripts/run-contract-tests.mjs`
  - 신규 focused contract test를 compile/run 목록에 추가.

## 검증

- Red 확인
  - 신규 테스트 추가 직후 `npm run test:contracts`가 `activity response extra fields did not fail closed`로 실패.
- Green 확인
  - Frontend `npm run test:contracts` 통과.
  - Frontend `npm run lint && npm test` 통과.
  - Backend `uv run pytest tests/test_route_response_model_contracts.py tests/test_public_schema_response_model_contracts.py` 통과: 8 passed.
  - CLI `npm test -- tests/api-client-json-boundary.test.ts` 통과: 1 passed.
- Hygiene
  - `src/lib/api-activity.ts`: 39 pure LOC.
  - `src/lib/api-integration-status.ts`: 41 pure LOC.
  - `src/lib/read-side-strict-fields.contract.test.ts`: 47 pure LOC.
  - `scripts/run-contract-tests.mjs`: 130 pure LOC.
  - diff 내 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, 신규 `any`, empty catch 없음.

> [!warning] LSP 제한
> 로컬에 `typescript-language-server`가 설치되어 있지 않아 LSP diagnostics는 실행되지 않았다. 대신 `tsc --noEmit` 기반 `npm run lint`로 타입 검증했다.

## 후행 과제

- `api-contract.test.ts`는 여전히 5000 LOC 이상인 기존 부채다. 이번처럼 신규 guard는 focused file로 추가하고, 별도 리팩터링 슬라이스에서 기능군별로 분리한다.
- 다음 contract audit 후보: `api-account.ts`의 `SetUsernameResponse`, integration guide/setup guide, notification/read action 등 아직 focused strict-field 테스트가 부족한 작은 응답 surface.

## 관련 노트

- [[Explore Strict Field Guards 2026-06-11]]
- [[Project Response Required Field Guard 2026-06-11]]
- [[Worklog Detail Diagnostics Strict Field Guard 2026-06-11]]
