---
title: Permissive List Normalizer Source Guard 2026-06-08
aliases:
  - NormalizeListResponse Source Guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/evidence
---

# Permissive List Normalizer Source Guard 2026-06-08

> [!success] 결과
> 실제 Frontend API read path에 permissive `normalizeListResponse<T>`가 다시 도입되지 않도록 source-contract regression test를 추가했다. `normalizeListResponse` 자체는 legacy/resilience utility와 unit test 용도로 남기되, API 성공 응답 envelope 검증은 strict normalizer만 사용하도록 회귀를 막는다.

## 변경 범위

- `src/lib/page-source-contract.test.ts`
  - `mustNotMatch()` helper 추가.
  - `src/lib/api.ts`에서 `.then(normalizeListResponse...)` 직접 호출을 금지.
  - `src/lib/api.ts` 내부 nested list guard가 `normalizeListResponse<...>(value)`를 호출하는 패턴을 금지.

## 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/page-source-contract.test.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- `npm run test:contracts`: 통과.
- `npm run lint`: 통과.
- OpenAPI contract gate: 75 operations, 70 client contracts, 40 response field contracts, 232 request body fields, 175 schema fields 통과.

## 후행 과제

- [ ] OpenAPI/client contract gate가 nested response shape drift를 더 직접적으로 포착하도록 schema-field coverage를 확장할 수 있는지 검토한다.
- [ ] CLI 수집/업로드 payload와 Backend ingest schema 사이의 field-level drift를 다시 한 번 end-to-end audit한다.

## 관련

- [[Active Tasks]]
- [[Strict Read List Envelope Guard 2026-06-08]]
- [[Search Explore Nested Contract Guard 2026-06-08]]
