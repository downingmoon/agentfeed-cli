---
title: Frontend API Integration Guide Split 2026-06-11
aliases:
  - Integration Guide API Split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Integration Guide Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`의 setup-guide parser와 integration type contract를 `src/lib/api-integration-guide.ts`로 분리했다.

- `normalizeIntegrationGuide`, `ApiIntegrationType`, `ApiIntegrationGuideStep`, `ApiIntegrationGuide`를 전용 모듈이 소유한다.
- 기존 consumer는 계속 `@/lib/api`에서 import할 수 있도록 `src/lib/api.ts`의 public export surface를 유지했다.
- integration status parser가 쓰는 `INTEGRATION_TYPES`/`parseIntegrationTypeValue`도 같은 전용 모듈에서 가져오도록 정리했다.
- source contract test는 setup-guide parser invariant의 소유 파일을 `api-integration-guide.ts`로 변경했다.

## 검증

- Frontend commit: `40e04c8 Keep integration guide contracts isolated`
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과

## LOC 상태

- `src/lib/api-integration-guide.ts`: 86 pure LOC
- `src/lib/api.ts`: 2,279 pure LOC
- `src/lib/api-transport.ts`: 250 pure LOC
- `src/lib/page-source-contract.test.ts`: 1,197 pure LOC

> [!warning] 남은 리스크
> `src/lib/api.ts`와 `src/lib/page-source-contract.test.ts`는 여전히 oversized 상태다. 기능 추가보다 domain별 parser/client extraction과 source-contract test split을 우선해야 한다.

## 다음 후보

1. `src/lib/api.ts`에서 ingestion token parser/client boundary를 별도 모듈로 분리.
2. `src/lib/api.ts`에서 social action response normalizer를 별도 모듈로 분리.
3. `src/lib/page-source-contract.test.ts`를 API/client/UI/route/source guard 별 파일로 나눠 테스트 파일 자체도 검토 가능한 크기로 축소.

관련 문서: [[Frontend API Transport Boundary Split 2026-06-11]], [[Frontend API Response Envelope Split 2026-06-11]], [[Frontend API Compatibility Split 2026-06-11]]
