---
title: Frontend Privacy Finding Resolution Contract Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - backend
  - api-contract
  - privacy
  - worklog-review
  - contract-mismatch
status: done
related:
  - "[[Backend Visibility Status Constraint Contract Split 2026-06-11]]"
  - "[[Worklog Review Response Guard 2026-06-08]]"
---

# Frontend Privacy Finding Resolution Contract Guard 2026-06-11

## 요약

Backend `WorklogReviewResponse.privacy_scan.findings[]`는 privacy finding의 처리 상태를 `resolution` 필드로 내려준다.
Frontend review 계약 파서는 `type`, `severity`, `resolved`는 닫힌 값으로 검증했지만 `resolution`은 타입/normalizer에서 보존하지 않아 backend 계약 필드가 UI 계층에서 조용히 사라질 수 있었다.

이번 작업은 신규 기능이 아니라 **Backend → Frontend privacy finding response contract 보존**이다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiPrivacyResolution = 'ignored' | 'redacted' | 'removed'` 추가
  - `ApiPrivacyFinding.resolution: ApiPrivacyResolution | null` 추가
  - `normalizePrivacyFindingForContract`가 `resolution`을 null 허용 닫힌 enum으로 검증하고 보존하도록 변경
- `agentfeed-frontend/src/lib/worklog-review-validation.ts`
  - review page 전용 privacy finding validator도 `resolution`을 검증/보존하도록 변경
  - privacy scan unavailable synthetic finding은 `resolution: null`을 명시
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - review payload fixture에 `resolution` 포함
  - 알 수 없는 `resolution` 값을 502 contract mismatch로 거부하는 케이스 추가
- `agentfeed-frontend/src/lib/worklog-review-validation.contract.test.ts`
  - validator가 `resolution`을 보존하는지 확인
  - malformed `resolution`을 fail-closed로 거부하는 케이스 추가
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - privacy finding resolution union/normalizer가 유지되는지 source-level contract guard 추가

## Backend 근거

Backend는 다음 위치에서 `resolution`을 명시적으로 포함한다.

- `agentfeed-backend/app/schemas/worklog.py`
  - `PrivacyFinding.resolution: PrivacyResolution | None`
- `agentfeed-backend/app/routers/worklogs.py`
  - `_privacy_finding_payload()`가 `"resolution": finding.resolution` 반환
- `agentfeed-backend/tests/test_worklog_review_privacy_contracts.py`
  - review response가 resolved row의 `resolution: "redacted"`를 포함해야 함을 검증

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/api-contract.test.ts src/lib/worklog-review-validation.contract.test.ts src/lib/page-source-contract.test.ts
npm test
npm run lint
git diff --check
```

결과: 모두 통과.

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest tests/test_worklog_review_privacy_contracts.py::test_worklog_review_prefers_fresh_privacy_rows_over_stale_scan_json -q
```

결과: `1 passed`.

## 제약 / 남은 리스크

> [!warning]
> Frontend `src/lib/api.ts`, `src/lib/api-contract.test.ts`, `src/lib/page-source-contract.test.ts`는 이미 거대한 contract hub 파일이다. 이번 작업은 mismatch를 줄이는 최소 변경으로 제한했고, 대형 파일 분리는 별도 리팩터링 slice로 다루는 것이 안전하다.

- 로컬 LSP diagnostics는 `typescript-language-server`가 설치되어 있지 않아 실행하지 못했다.
- 대신 `npm run lint`가 `tsc --noEmit`을 수행해 타입 검증을 통과했다.
- 서버 배포는 현재 goal 규칙에 따라 수행하지 않았다.

## 후행 후보

- [[Frontend API Contract Hub Split Candidate 2026-06-11]] 문서로 `api.ts` / `api-contract.test.ts` 분리 계획을 별도 관리한다.
- review privacy finding의 `resolution`을 UI에서 더 명확히 보여주는 것은 신규 UX 기능이므로, 필요 시 별도 설계 후 진행한다.

> [!success] 2026-06-19 follow-up
> The remaining validation assertions in `worklog-review-validation.contract.test.ts` were moved to `worklog-review-validation-assertions.ts` in [[Frontend Worklog Review Validation Assertion Move 2026-06-19]]. The runner is now 2 pure LOC.
