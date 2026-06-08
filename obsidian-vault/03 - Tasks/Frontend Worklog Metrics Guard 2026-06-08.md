---
title: Frontend Worklog Metrics Guard 2026-06-08
aliases:
  - Worklog metrics guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/worklog
  - agentfeed/multi-agent
  - agentfeed/evidence
---

# Frontend Worklog Metrics Guard 2026-06-08

> [!success] 완료
> Worklog metrics adapter가 multi-agent evidence를 빈 배열/부분 UI로 숨기지 않고, malformed present payload를 fail-closed 처리하도록 보강했다.

## 변경 요약

- `agentfeed-frontend/src/lib/adapters.ts`
  - `assertNormalizedMetrics`가 단순 object cast 대신 metric field를 실제 검증하도록 변경.
  - top-level numeric metrics는 `number|null|undefined`만 허용하고, malformed string/negative/non-finite 값은 contract mismatch로 처리.
  - `models_used`, `agent_modes`, per-agent `agent_modes`는 `string[]|null|undefined`만 허용.
  - `agent_metrics`는 array/null만 허용하며 각 row의 `agent`, nullable string fields, nullable numeric fields, per-agent modes를 검증.
  - `collection_sources`는 array/null만 허용하며 `type`, `name`, `quality` enum을 검증.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - multi-agent metrics의 model names, per-agent tokens/commands, global/per-agent modes, collection source evidence 보존 회귀 추가.
  - malformed metrics examples가 `Frontend adapter contract mismatch`로 fail-closed 되는 회귀 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - metrics nested guard source regression 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 배포 상태

> [!info] 서버 배포 안 함
> 현재 active goal 규칙에 따라 이번 slice는 개인 서버 배포를 수행하지 않았다.

## 후행 과제

- [ ] Project mutation response adapter는 read adapter와 다른 계약이므로 별도 점검.
- [ ] Worklog review helper(`collection-evidence.ts`)는 API-normalized payload를 전제로 하지만, malformed row filter가 계약 오류를 숨길 가능성이 있는지 별도 source audit.
