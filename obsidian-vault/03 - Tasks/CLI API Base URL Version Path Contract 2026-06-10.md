---
title: CLI API Base URL Version Path Contract
date: 2026-06-10
type: task
status: done
area:
  - CLI
  - API Contract
related:
  - "[[Enterprise Readiness Worklog]]"
---

# CLI API Base URL Version Path Contract

## 결론

CLI의 `AGENTFEED_API_BASE_URL`은 백엔드 API 계약 경로인 `/v1`까지 포함해야 한다.

- 올바른 예: `https://api.example.com/v1`
- 로컬/개발 예: `http://localhost:8001/v1`
- 잘못된 예: `https://api.example.com`

이번 작업에서 CLI가 `/v1`이 빠진 API origin을 조용히 수락하지 않고 즉시 실패하도록 수정했다.

## 배경

Backend API는 `/v1/*` 아래에서 제공된다. CLI는 `AGENTFEED_API_BASE_URL` 값을 기준으로 `metadata`, `publish`, `login` 등 API 경로를 조합한다.

기존에는 `https://api.agentfeed.dev`처럼 `/v1`이 빠진 값을 수락할 수 있었고, 이 경우 CLI가 `/v1/metadata`가 아니라 `/metadata`를 호출하게 된다. 결과적으로 호환성 체크나 로그인 단계에서 원인 파악이 어려운 오류가 발생할 수 있었다.

## 변경 사항

- `src/config/api-base.ts`
  - API base URL path가 정확히 `/v1`이 아니면 실패하도록 변경.
  - 쿼리, 해시, 계정 정보 차단 정책은 유지.
  - HTTP 원격 URL 차단 정책은 유지.
- `tests/api-base-contract.test.ts`
  - `/v1`이 빠진 root API URL을 거부하는 red/green 회귀 테스트 추가.

## 검증

Red evidence:

```bash
npm test -- --run tests/api-base-contract.test.ts
```

- 기존 동작은 `https://api.agentfeed.dev`를 resolve 하며 테스트 실패.

Green evidence:

```bash
npm test -- --run tests/api-base-contract.test.ts tests/config.test.ts
npm run typecheck
npm run build
npm test -- --run
```

- targeted tests: 37 passed
- typecheck: passed
- build: passed
- full tests: 600 passed

## 주의: Frontend URL과 CLI URL의 의미 차이

Frontend의 `NEXT_PUBLIC_API_URL`은 별도 규칙을 가질 수 있다. 반면 CLI의 `AGENTFEED_API_BASE_URL`은 API version path까지 포함하는 값으로 유지한다.

사용자 안내 문서에서는 두 값을 같은 의미로 설명하지 않도록 한다.

## 후행 과제

- 원격 실서버 로그인/게시 플로우는 이번 work item에서 실행하지 않았다.
- CLI README와 배포 가이드에서 `AGENTFEED_API_BASE_URL` 예시가 모두 `/v1`을 포함하는지 주기적으로 점검한다.
- Frontend/Backend 쪽 문서에는 frontend root URL semantics와 CLI versioned API URL semantics를 분리해서 표기한다.

## 배포

- 서버/인프라/CICD/배포 작업 없음.
