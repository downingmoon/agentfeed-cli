---
title: Worklog Review Strict Extra Field Guard
date: 2026-06-11
tags:
  - agentfeed/contracts
  - frontend
  - backend
  - verification
status: done
---

# Worklog Review Strict Extra Field Guard

## 요약

Backend `WorklogReviewResponse` 계열은 Pydantic `extra="forbid"`로 review 응답의 예상 외 필드를 거부한다. Frontend review normalizer도 같은 계약을 따르도록 top-level, `worklog`, `preview` 객체의 unexpected field를 fail-closed 처리했다.

## 수정 이유

> [!warning]
> Review 화면은 publish 직전 사용자 확인 경계이므로, Backend가 허용하지 않는 raw/debug/private 필드가 Frontend에서 조용히 무시되거나 통과되면 계약 드리프트를 놓칠 수 있다.

확인된 불일치:

- Backend: `WorklogReviewResponse`, `WorklogReviewWorklog`, `WorklogReviewPreview` 모두 extra field 금지.
- Frontend: 기존 `normalizeWorklogReviewResponse`는 필수 필드 타입은 확인했지만 unexpected field는 거부하지 않았다.

## 변경 내용

- `agentfeed-frontend/src/lib/api-worklog-review.ts`
  - review 응답 top-level 허용 필드: `worklog`, `privacy_scan`, `preview`
  - review `worklog` 허용 필드: `id`, `title`, `summary`, `user_note`, `model`, `visibility`, `status`, `public_prompt`, `metrics`, `source`
  - review `preview` 허용 필드: `card_title`, `card_summary`, `public_fields`, `private_fields`, `safe_public_preview`
  - 세 객체 모두 `rejectUnexpectedKeysForContract`로 fail-closed.
- `agentfeed-frontend/src/lib/worklog-review-strict-fields.contract.test.ts`
  - valid review fixture가 정상 통과하는지 확인.
- `agentfeed-frontend/src/lib/worklog-review-strict-field-assertions.ts`
  - 2026-06-18 [[Frontend Worklog Review Strict Field Assertion Move 2026-06-18]]에서 runner-owned assertion flow를 이동.
  - top-level `debug`, `worklog.private_raw_note`, `preview.raw_private_fields`가 `ApiError(502)`로 차단되는지 회귀 테스트 추가.
- `agentfeed-frontend/scripts/run-contract-tests.mjs`
  - 새 계약 테스트를 전체 contract suite에 포함.

## 검증

- Frontend
  - `npm run test:contracts` 통과
  - `npm run lint` 통과 (`tsc --noEmit`)
  - `npm test` 통과
- Backend
  - `uv run pytest tests/test_worklog_response_model_contracts.py tests/test_route_response_model_contracts.py` 통과: 8 passed
- CLI
  - `npm test -- tests/api-client-json-boundary.test.ts` 통과
- LOC 점검
  - `src/lib/api-worklog-review.ts`: 99 pure LOC
  - `src/lib/worklog-review-strict-fields.contract.test.ts`: originally 98 pure LOC; 2026-06-18 split result is 5 pure LOC runner plus 46 pure LOC assertion helper
  - `scripts/run-contract-tests.mjs`: 116 pure LOC

> [!info]
> LSP diagnostics는 로컬 `typescript-language-server`가 설치되어 있지 않아 실행하지 못했다. 대신 같은 범위의 타입 검증은 Frontend `npm run lint`의 `tsc --noEmit`로 통과 확인했다.

## 후행 과제

- [x] Worklog review strict-field assertion flow moved in [[Frontend Worklog Review Strict Field Assertion Move 2026-06-18]].
- Review 응답 외의 read-only 상세 응답도 Backend `extra="forbid"` 모델과 Frontend normalizer의 unexpected-field 처리 방식이 완전히 동일한지 계속 감사한다.
