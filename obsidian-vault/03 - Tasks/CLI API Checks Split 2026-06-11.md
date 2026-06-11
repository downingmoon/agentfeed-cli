---
title: CLI API Checks Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - api-contract
  - refactor
  - verification
status: done
---

# CLI API Checks Split 2026-06-11

## 요약

API reachability, metadata compatibility, ingestion token status check orchestration을 `src/api/api-checks.ts`로 분리했다.

> [!success]
> 신규 기능 없이 기존 `client.ts` public API를 유지하면서 API compatibility/token check 책임을 전용 모듈로 이동했고, `src/api/client.ts`를 250 pure LOC 이하로 낮췄다.

## 변경 파일

- `src/api/api-checks.ts`
  - `ApiCheckResult`
  - `ApiCompatibilityCheckResult`
  - `EXPECTED_API_VERSION`
  - `EXPECTED_API_CONTRACT_VERSION`
  - `apiMetadataCompatible`
  - `checkApiReachability`
  - `checkApiCompatibility`
  - `checkIngestionToken`
- `src/api/client.ts`
  - API check 구현 제거
  - 기존 public 함수/타입/상수 import 경로 호환을 위해 재-export 유지

## 검증

### Targeted

```bash
npm run typecheck
npm test -- --run tests/api-hook.test.ts
```

결과: 1 file / 132 tests passed

### Final

```bash
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

결과:

- full tests: 35 files / 610 tests passed
- typecheck/build/diff check 통과
- LOC review:
  - `src/api/api-checks.ts`: 135 pure LOC
  - `src/api/client.ts`: 164 pure LOC

> [!warning]
> LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가했다. 대신 `npm run typecheck`, `npm run build`, targeted/full Vitest suite로 검증했다.

## 후행 과제

- `src/api/client.ts`는 294 → 164 pure LOC로 250 기준을 만족한다.
- 다음 품질 과제:
  - `tests/api-hook.test.ts` 관심사별 분리
  - CLI/Frontend/Backend contract matrix 최신 재검증
  - Frontend/Backend도 동일 기준으로 oversized 파일과 silent failure 점검

## 배포

현재 goal 규칙상 서버/인프라/배포는 보류하므로 수행하지 않았다.
