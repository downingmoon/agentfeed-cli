---
title: Frontend Worklog Source Viewer Guard 2026-06-08
aliases:
  - Worklog source viewer guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/worklog
  - agentfeed/evidence
---

# Frontend Worklog Source Viewer Guard 2026-06-08

> [!success] 완료
> Worklog adapter가 `source` / `viewer_state`의 API-authorized absent state와 malformed present object를 구분하도록 보강했다.

## 변경 요약

- `agentfeed-frontend/src/lib/adapters.ts`
  - `assertOptionalWorklogSource` 추가.
  - `source: null`/missing은 허용하지만, source object가 있으면 `agent`, `collection_quality`, `collection_window_reason`, nullable string fields, `collection_window.since/until`을 검증한다.
  - `assertOptionalViewerState` 추가.
  - `viewer_state: null`/missing은 허용하지만, object가 있으면 required booleans와 optional `can_comment` boolean을 검증한다.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid source evidence preserve 회귀 유지.
  - `source: null` explicit absent UI state 회귀 추가.
  - malformed source object fail-closed 회귀 추가.
  - valid viewer_state preserve 회귀 유지.
  - missing `can_comment` → false 회귀 추가.
  - malformed viewer_state fail-closed 회귀 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - source/viewer_state adapter guard source regression 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 후행 과제

- [ ] `adaptMetrics` nested `agent_metrics`, `collection_sources`, `models_used`, `agent_modes`의 nullable arrays와 malformed object masking 여부 점검.
- [ ] Project mutation response adapter는 read adapter와 다른 계약이므로 별도 점검.
