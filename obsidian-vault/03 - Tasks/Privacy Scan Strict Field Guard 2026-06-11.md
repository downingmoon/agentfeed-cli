---
title: Privacy Scan Strict Field Guard
date: 2026-06-11
tags:
  - agentfeed/contracts
  - frontend
  - backend
  - verification
status: done
---

# Privacy Scan Strict Field Guard

## 요약

Backend `PrivacyScanResult`와 `PrivacyFinding` 모델은 `extra="forbid"`를 사용한다. Frontend `normalizePrivacyScanForContract`도 동일하게 `privacy_scan`과 `privacy_scan.findings[]`의 unexpected field를 fail-closed 처리하도록 수정했다.

## 수정 이유

> [!warning]
> privacy scan은 publish/review의 안전 경계다. raw scan payload나 secret-like debugging field가 Frontend boundary를 통과하면 Backend 계약 드리프트 또는 민감정보 노출 가능성을 조기에 발견하지 못한다.

## 변경 내용

- `agentfeed-frontend/src/lib/api-privacy-scan.ts`
  - `privacy_scan` 허용 필드: `status`, `findings`
  - `privacy_scan.findings[]` 허용 필드: `id`, `type`, `severity`, `message`, `field`, `resolved`, `resolution`
  - 두 객체 모두 `rejectUnexpectedKeysForContract`로 fail-closed.
- `agentfeed-frontend/src/lib/privacy-scan-strict-fields.contract.test.ts`
  - valid review fixture가 정상 통과하는지 확인.
  - `privacy_scan.raw_scan`, `privacy_scan.findings[].raw_secret`가 `ApiError(502)`로 차단되는지 회귀 테스트 추가.
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
  - `src/lib/api-privacy-scan.ts`: 58 pure LOC
  - `src/lib/privacy-scan-strict-fields.contract.test.ts`: 104 pure LOC
  - `scripts/run-contract-tests.mjs`: 120 pure LOC

> [!info]
> LSP diagnostics는 로컬 `typescript-language-server`가 설치되어 있지 않아 실행하지 못했다. 동일 범위의 타입 검증은 Frontend `npm run lint`의 `tsc --noEmit`로 통과 확인했다.

## 후행 과제

- 다른 nested public response 객체 중 아직 direct `rejectUnexpectedKeysForContract`가 없는 boundary를 계속 감사한다.
