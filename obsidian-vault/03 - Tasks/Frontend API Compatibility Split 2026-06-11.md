---
title: Frontend API Compatibility Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/refactor
status: completed
aliases:
  - 2026-06-11 Frontend API Compatibility Module Split
---

# Frontend API Compatibility Split 2026-06-11

> [!success] 완료
> `agentfeed-frontend/src/lib/api.ts`에서 backend metadata compatibility 책임을 `src/lib/api-compatibility.ts`로 분리했다. `src/lib/api`의 public export surface는 유지했다.

## 왜 했나

[[Cross Repo Contract Audit 2026-06-11]]에서 contract mismatch는 발견되지 않았지만, `src/lib/api.ts`가 3,000줄을 넘는 단일 API boundary로 남아 있어 유지보수 리스크가 컸다. 신규 기능 없이 enterprise 품질을 높이기 위해, 테스트 커버리지가 있는 작은 책임 단위부터 분리했다.

## 변경 내용

- 추가: `src/lib/api-compatibility.ts`
  - `EXPECTED_API_VERSION`
  - `EXPECTED_API_CONTRACT_VERSION`
  - `AGENTFEED_FRONTEND_VERSION`
  - `ApiClientCompatibility`
  - `ApiMetadata`
  - `isBackendCompatible`
- 변경: `src/lib/api.ts`
  - 위 compatibility API를 새 모듈에서 re-export하도록 변경
  - `system.metadata()`의 `ApiMetadata` type import만 유지

## 검증 evidence

- Frontend commit: `2016fda Separate frontend API compatibility checks`
- `npm run lint` 통과
- `npm test` 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build` 통과
- LOC snapshot:
  - `src/lib/api.ts`: 3,010 lines / 2,665 pure LOC
  - `src/lib/api-compatibility.ts`: 63 lines / 55 pure LOC

## 후행 과제

> [!warning] 남은 구조 리스크
> `src/lib/api.ts`는 여전히 2,665 pure LOC로 과대하다. 다음에도 public API를 유지하면서 하나의 책임 단위씩 분리해야 한다.

권장 다음 순서:

1. API error/transport boundary 분리 또는 endpoint client group 분리 전 의존성 맵 작성.
2. `ApiError`/`apiFetch` 주변 transport contract를 독립 모듈로 분리할 수 있는지 검토.
3. 불가능하면 types/constants → normalizers → endpoint clients 순으로 점진 분리.
4. 각 분리마다 `npm run lint`, `npm test`, 필요시 `npm run build` 실행.

## 관련 문서

- [[Cross Repo Contract Audit 2026-06-11]]
- [[Active Tasks]]
