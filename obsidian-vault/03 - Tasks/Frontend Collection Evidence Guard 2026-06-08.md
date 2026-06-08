---
title: Frontend Collection Evidence Guard 2026-06-08
aliases:
  - Collection evidence guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/worklog
  - agentfeed/review
  - agentfeed/evidence
---

# Frontend Collection Evidence Guard 2026-06-08

> [!success] 완료
> Worklog review의 collection evidence helper가 malformed model/agent/source evidence를 `filter`로 숨기지 않고 fail-closed 처리하도록 보강했다.

## 발견한 문제

- `modelsUsed()`가 `models_used?.filter(Boolean)`을 사용해 빈 model string을 조용히 제거할 수 있었다.
- `collectionAgentMetrics()`가 `filter(metric => metric.agent)`를 사용해 agent 없는 per-agent row를 조용히 제거할 수 있었다.
- `collectionSourcesLabel()`와 quality/window label helper는 API-normalized payload를 전제로 했지만, helper 단에서 malformed quality/source/window reason을 명시적으로 거부하지 않았다.

## 변경 요약

- `agentfeed-frontend/src/lib/collection-evidence.ts`
  - `Frontend collection evidence contract mismatch` error path 추가.
  - `models_used`와 fallback `worklog.model`은 non-empty string만 허용.
  - `agent_metrics`는 array/null만 허용하고, 각 row의 `agent`, optional `model`, optional `session_id`, optional `agent_modes`를 검증.
  - `collection_sources`는 array/null만 허용하고, source `type`, `name`, `quality`를 검증.
  - `collection_quality`, `collection_window_reason` invalid value를 `-`로 숨기지 않도록 fail-closed 처리.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid review evidence fixture를 재사용 가능한 `reviewWithCollectionEvidence`로 정리.
  - malformed models, agent metrics, collection sources, collection quality, window reason 회귀 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - `filter(Boolean)` / `filter(metric => metric.agent)` 재도입 방지 source regression 추가.

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

- [ ] Project create/update 후 owner username missing 상태에서 route target이 의도대로 legacy project id route로 이동하는지 browser smoke 후보.
- [ ] `WorklogReviewPage.isUsableWorklogReview`가 API-normalized review payload 기준으로 너무 약한지 별도 점검.
