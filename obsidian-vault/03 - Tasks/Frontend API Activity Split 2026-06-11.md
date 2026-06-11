---
title: Frontend API Activity Split 2026-06-11
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Activity Split 2026-06-11

## 목적

Frontend `src/lib/api.ts`의 public profile activity response contract 책임을 별도 module로 분리해 API facade를 계속 축소한다.

## 변경

- `agentfeed-frontend/src/lib/api-activity.ts` 추가.
  - `ApiUserActivityDay`, `ApiUserActivity` 타입 소유.
  - `/users/:username/activity` response parser를 fail-closed 유지.
  - `tokens_used`는 `null` 또는 non-negative finite number만 허용.
- `nullableNumberForContract`를 `api-contract-primitives.ts`로 이동해 dashboard 외 read-contract parser들도 같은 primitive를 공유할 수 있게 했다.
- `agentfeed-frontend/src/lib/api.ts`는 `@/lib/api` public type export와 `users.activity()` 호출 surface만 유지.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint
npm test
NEXT_PUBLIC_API_URL=http://localhost:8000 \
  AGENTFEED_ALLOW_LOCAL_API_BUILD=1 \
  AGENTFEED_SKIP_PROD_API_COMPAT=1 \
  npm run build
```

결과:

- `npm run lint`: 통과.
- `npm test`: 통과.
- `npm run build`: 통과, Next.js 15.5.19 production build 성공.

## LOC evidence

```text
src/lib/api.ts pure LOC: 1862
src/lib/api-activity.ts pure LOC: 35
src/lib/api-contract-primitives.ts pure LOC: 96
```

> [!warning]
> `api.ts`는 여전히 250 pure LOC를 초과한다. 이번 slice는 public activity 계약만 분리했으며, 다음 slice에서 notification/discovery/search 등 남은 read-contract cluster를 계속 분리해야 한다.

## Commit

- Frontend: `c56eccd` — `Isolate frontend activity contracts`

## 후속 작업

- `api.ts`의 notification list parser cluster를 별도 module로 분리한다.
- oversized `page-source-contract.test.ts`를 domain별 source contract test로 분리한다.
