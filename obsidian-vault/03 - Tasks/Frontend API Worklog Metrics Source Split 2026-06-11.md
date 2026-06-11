---
title: Frontend API Worklog Metrics Source Split 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/multi-agent
  - agentfeed/verification
aliases:
  - Frontend worklog metrics source contract split
---

# Frontend API Worklog Metrics Source Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`에 남아 있던 worklog metrics/source evidence 계약을 전용 모듈로 분리했다.

- `src/lib/api-worklog-taxonomy.ts`
  - `WORKLOG_AGENT_TYPES`
  - `WORKLOG_CATEGORIES`
  - `WorklogAgentType`
  - `WorklogCategory`
- `src/lib/api-worklog-metrics-source.ts`
  - `ApiCollectionSource`
  - `ApiAgentMetricSummary`
  - `ApiCollectionWindow`
  - `ApiWorklogSource`
  - `ApiWorklogMetrics`
  - `optionalWorklogSourceForContract`
  - `normalizeWorklogMetricsForContract`
- `src/lib/api-contract-primitives.ts`
  - 공통 `optionalStringArrayForContract`를 primitive로 승격.
- `@/lib/api` public export facade는 유지했다.

## 왜 이 slice를 먼저 했나

`normalizeWorklogCardForContract`를 바로 분리하려면 metrics/source뿐 아니라 project summary, social stats, viewer state parser까지 동시에 이동해야 한다. 이번 작업은 search/card split의 선행 조건 중 multi-agent evidence와 직접 연결되는 metrics/source 책임만 먼저 격리했다.

> [!note]
> 이 작업은 사용자가 요구한 “모든 agent의 모델/토큰/tool call/commands 등 수집 데이터가 누락되지 않아야 한다”는 방향과 직접 연결된다. Frontend API boundary에서 multi-agent metrics shape를 별도 모듈로 고정해 후속 card/search 분리를 안전하게 만든다.

## 검증

- Frontend commit: `d326b47` (`Isolate frontend worklog metrics contracts`)
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과
- LOC evidence:
  - `src/lib/api-worklog-metrics-source.ts`: 169 pure LOC
  - `src/lib/api-worklog-taxonomy.ts`: 4 pure LOC
  - `src/lib/api-contract-primitives.ts`: 104 pure LOC
  - `src/lib/api.ts`: 1477 pure LOC, inherited oversized file이며 이번 slice에서 170 pure LOC 감소
  - `src/lib/page-source-contract.test.ts`: 1209 pure LOC, inherited oversized test file

## 후행 작업

- [ ] `ApiWorklogSocialStats` / `ApiWorklogViewerState` parser를 전용 모듈로 분리.
- [ ] `ApiProjectSummary` read parser를 전용 모듈로 분리.
- [ ] 그 다음 `normalizeWorklogCardForContract`와 list response parser를 `api-worklog-card.ts`로 분리.
- [ ] worklog-card 분리 후 search response/client contract를 `api-search.ts`로 분리.
- [ ] `src/lib/page-source-contract.test.ts`를 domain별 source-contract test로 분할.
