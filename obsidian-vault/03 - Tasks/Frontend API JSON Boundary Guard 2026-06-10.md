---
title: Frontend API JSON Boundary Guard 2026-06-10
aliases:
  - Frontend API JSON Boundary Guard
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/security
  - agentfeed/verification
updated: 2026-06-10
---

# Frontend API JSON Boundary Guard 2026-06-10

> [!success] 결론
> Frontend 공통 API client의 response body JSON 파싱을 `JSON.parse(body) as unknown` 캐스팅에서 `const parsed: unknown = JSON.parse(body)` 경계로 바꿨다. API 응답은 untrusted input이므로 envelope validation 전에는 항상 `unknown`으로 유지한다.

## 변경 범위

- Frontend `src/lib/api.ts`
  - `parseApiJson`에서 `JSON.parse(body)` 결과를 명시적인 `unknown` 변수에 할당.
  - 기존 `validateSuccessEnvelope(parsed, path)` 흐름과 generic return surface는 유지.
- Frontend `src/lib/api-json-boundary.contract.test.ts`
  - `JSON.parse(body) as unknown` 재도입 방지 source contract 추가.
  - `const parsed: unknown = JSON.parse(body);` 경계 유지 contract 추가.
- Frontend `scripts/run-contract-tests.mjs`
  - API JSON boundary contract를 전체 contract suite에 포함.

## Contract rule

```text
Frontend API response JSON must enter the client as unknown before envelope validation.
```

> [!warning] 유지 규칙
> API 응답 경계에서 `any`/cast 기반 우회가 들어오면 adapter/normalizer의 계약 검증이 약해진다. `JSON.parse` 결과는 즉시 도메인 타입으로 간주하지 않는다.

## Verification evidence

- Red 확인:
  - `npm run test:contracts` → `API response JSON parsing must assign JSON.parse(body) to an unknown-typed variable...`
- Frontend green:
  - `npm run test:contracts` → pass
  - `npm run lint` → pass
  - `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` → pass
- Static scan:
  - `rg "JSON\\.parse\\(body\\) as unknown|as any|@ts-ignore|@ts-expect-error" src/lib/api.ts` → no matches
- LOC check:
  - `src/lib/api.ts` → 2720 logical lines
  - `src/lib/api-json-boundary.contract.test.ts` → 8 logical lines
  - `scripts/run-contract-tests.mjs` → 77 logical lines
- Not tested:
  - LSP diagnostics: local `typescript-language-server` is not installed.

## Related

- [[CLI Authorize Storage Boundary Guard 2026-06-10]]
- [[Frontend Worklog Detail Array Contract Guard 2026-06-08]]
