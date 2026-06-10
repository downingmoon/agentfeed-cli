---
title: CLI API JSON Boundary Guard 2026-06-10
aliases:
  - CLI API JSON Boundary Guard
status: done
tags:
  - agentfeed/cli
  - agentfeed/contract
  - agentfeed/security
  - agentfeed/verification
updated: 2026-06-10
---

# CLI API JSON Boundary Guard 2026-06-10

> [!success] 결론
> CLI 공통 API client의 `Response.json()` 결과를 typed cast로 바로 신뢰하지 않도록 고정했다. API metadata/status 응답은 `unknown` 경계로 받은 뒤 구조 검증과 전용 parser를 통과해야 CLI 내부 타입으로 들어온다.

## 변경 범위

- CLI `src/api/client.ts`
  - `response.json() as unknown` 제거.
  - `response.json() as { data?: IngestionTokenStatus }` 제거.
  - `parseCheckData`, `parseMetadataResponse`, `parseIngestionTokenStatusResponse`가 `const parsed: unknown = await response.json()` 경계를 사용하도록 변경.
  - metadata `data`도 `as ApiMetadata`로 cast하지 않고 parser 결과만 수용.
- CLI `src/api/metadata.ts`
  - API metadata schema boundary를 76 logical LOC의 작은 parser module로 분리.
  - root fields, `supported_clients`, client `min_version`/`contract_version`을 필드별로 검증.
- CLI `tests/api-client-json-boundary.test.ts`
  - `Response.json()` typed cast 재도입 방지 source contract 추가.

## Contract rule

```text
CLI API response JSON must enter as unknown, then be structurally parsed before becoming ApiMetadata or IngestionTokenStatus.
```

> [!warning] 유지 규칙
> API 응답은 항상 untrusted boundary다. `response.json() as SomeType` 또는 `response.json() as unknown` 방식으로 경계를 통과시키지 않는다.

## Verification evidence

- Red 확인:
  - `npx vitest run tests/api-client-json-boundary.test.ts --reporter=verbose` → `response.json() as unknown` 때문에 실패.
- Targeted green:
  - `npx vitest run tests/api-client-json-boundary.test.ts tests/api-hook.test.ts --reporter=verbose` → `2 files / 133 tests passed`.
- Full CLI:
  - `npm run build` → pass.
  - `npm run typecheck` → pass.
  - `npm test -- --run` → `32 files / 598 tests passed`.
- Manual CLI surface smoke:
  - `node dist/cli/index.js --help` → root usage printed.
  - `node dist/cli/index.js status` → status rendered without crash; local environment correctly reports invalid `AGENTFEED_API_BASE_URL` attention item.
- Static scan:
  - `rg "response\\.json\\(\\) as" src/api/client.ts src/api/metadata.ts` → no matches.
- LOC check:
  - `src/api/metadata.ts` → 76 logical lines.
  - `tests/api-client-json-boundary.test.ts` → 10 logical lines.
  - `src/api/client.ts` → 1243 logical lines after net reduction.
- Not tested:
  - LSP diagnostics: local `typescript-language-server` is not installed.

## Follow-up

> [!todo]
> `src/api/client.ts` remains an inherited oversized module above the 250-LOC ceiling. This work extracted the touched metadata parser, but future CLI API-client work should keep carving cohesive units out instead of adding more logic to `client.ts`.

## Related

- [[Frontend API JSON Boundary Guard 2026-06-10]]
- [[CLI Authorize Storage Boundary Guard 2026-06-10]]
