---
title: CLI API Transport Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - api-contract
  - refactor
  - verification
status: done
---

# CLI API Transport Split 2026-06-11

## 요약

API request timeout, network diagnostics, retry policy, API URL construction을 `src/api/transport.ts`로 분리했다.

> [!success]
> 신규 기능 없이 기존 API 요청/재시도/timeout/error message 동작을 유지하면서, `src/api/client.ts`에서 transport 책임을 제거했다.

## 변경 파일

- `src/api/transport.ts`
  - `API_CHECK_TIMEOUT_MS`
  - `apiUrl`
  - `describeNetworkFailure`
  - `fetchWithTimeout`
  - `withTransientRetry`
  - timeout/retry env policy
- `src/api/client.ts`
  - transport 구현 제거
  - health/metadata/token/publish orchestration만 유지

## 검증

### Targeted

```bash
npm run typecheck
npm test -- --run tests/api-hook.test.ts tests/api-non-json-error-diagnostics.test.ts
```

결과: 2 files / 134 tests passed

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
  - `src/api/transport.ts`: 136 pure LOC
  - `src/api/client.ts`: 294 pure LOC

> [!warning]
> LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가했다. 대신 `npm run typecheck`, `npm run build`, targeted/full Vitest suite로 검증했다.

## 후행 과제

- `src/api/client.ts`는 422 → 294 pure LOC로 크게 줄었지만, 아직 250 pure LOC 기준을 약간 넘는다.
- 다음 분리 후보:
  - API health / metadata / ingestion-token check orchestration
  - `postJson` / `postIngest` request-envelope helper
- `tests/api-hook.test.ts`는 관심사별 테스트 파일 분리 필요.

## 배포

현재 goal 규칙상 서버/인프라/배포는 보류하므로 수행하지 않았다.
