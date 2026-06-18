---
type: task
status: done
date: 2026-06-11
repos:
  - AgentFeed-CLI
  - agentfeed-backend
  - agentfeed-frontend
tags:
  - agentfeed
  - contract
  - metrics
  - multi-agent
  - enterprise-hardening
---

# Multi Agent Metric Evidence Contract 2026-06-11

## 결론

multi-agent 작업 증거는 CLI collector에서 aggregate + per-agent breakdown으로 만들어지고, Backend `WorklogMetrics` schema에서 보존/검증되며, Frontend API parser와 adapter/review evidence helper를 거쳐 공개 카드·상세·리뷰 화면에 전달된다.

이번 slice에서 발견한 gap은 Frontend API metrics/source parser가 nested object의 예상 외 raw field를 일부 무시할 수 있다는 점이었다. Backend는 이미 `extra="forbid"`로 막고 있으므로 Frontend도 동일하게 fail-closed 하도록 보강했다.

> [!success]
> 신규 기능은 추가하지 않았고, 세 레포 계약 정합성을 높이는 API boundary hardening만 수행했다.

## 계약 매트릭스

| Evidence | CLI 수집/전송 | Backend 저장/검증 | Backend public/review | Frontend API/Adapter | Frontend UI |
| --- | --- | --- | --- | --- | --- |
| aggregate counters | `tokens_used`, `commands_run`, `tool_calls`, `skills_used`, `subagents_*`, `agent_turns`를 aggregate로 생성 | `WorklogMetrics` non-negative schema | public은 metric privacy에 따라 일부 null 처리, review는 owner-only full metrics | `normalizeWorklogMetricsForContract` strict parse | detail/review metric strips에 표시 |
| models | `models_used`를 여러 agent session에서 merge | `list[MetricEvidenceLabel]`로 빈 문자열 거부 | public/review 모두 계약 필드로 유지 | empty/non-string 모델 거부 | Models label에 모든 모델 표시 |
| per-agent breakdown | `agent_metrics[]`에 agent/model/session/tokens/actions/modes 저장 | `AgentMetricSummary(extra="forbid")`로 agent enum, raw extras, empty modes 거부 | public metric privacy가 token/file/line/test 하위 필드도 null 처리 | agent_metrics row allowlist 추가, raw payload 거부 | review evidence에서 per-agent rows 표시 |
| collection trust | `collection_quality`, `collection_sources[]` 생성 | quality/type/name schema 검증, raw extras 거부 | public source/evidence로 유지 가능한 범위만 | collection source allowlist 추가, raw payload 거부 | review trust evidence 표시 |
| source window | `source.collection_window`, `collection_fingerprint` 전송 | ingest/review source schema extra forbid | public source는 allowlist, review source는 owner-only evidence | source/window allowlist 추가, raw path/window 거부 | review/detail evidence에 window/fingerprint 표시 |

## 변경 사항

### [[agentfeed-frontend]]

Commit: `855c1ee Reject unexpected frontend metric evidence fields`

- `src/lib/api-worklog-metrics-source.ts`
  - `rejectUnexpectedKeysForContract`를 metrics/source parser에 적용.
  - `WorklogMetrics`, `AgentMetricSummary`, `CollectionSource`, `WorklogSource`, `CollectionWindow` allowlist를 명시.
- `src/lib/worklog-metric-evidence.contract.test.ts`
  - root metrics raw field, per-agent raw payload, collection source raw payload, source raw field, collection window raw field 거부 케이스 추가.

## Fresh verification

### Frontend

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
npm run lint && npm test
```

Result: passed.

LOC check:

- `src/lib/api-worklog-metrics-source.ts`: 179 pure LOC
- `src/lib/worklog-metric-evidence.contract.test.ts`: originally 41 pure LOC; 2026-06-18 split result is 2 pure LOC runner plus 53 pure LOC fixture module

### Backend

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest \
  tests/test_worklog_schema_contracts.py \
  tests/test_worklog_card_frontend_contracts.py \
  tests/test_worklog_review_privacy_contracts.py \
  tests/test_worklog_public_detail_contracts.py
```

Result: 14 passed.

### CLI

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- --run \
  tests/session-collector.test.ts \
  tests/api-hook.test.ts \
  tests/draft-validation.test.ts \
  tests/share.test.ts \
  tests/explain.test.ts
```

Result: 5 files / 221 tests passed.

## 판단

현재 multi-agent metric evidence 범위에서는 다음이 성립한다.

- CLI는 여러 agent/model/session의 token/action/tool/command evidence를 aggregate + per-agent 형태로 보존한다.
- Backend는 같은 필드명을 schema로 검증하고, public viewer metric privacy도 per-agent row까지 적용한다.
- Frontend는 backend와 같은 allowlist 기준으로 API boundary에서 raw extras를 거부하고, adapter/review evidence helper가 malformed rows를 조용히 드롭하지 않는다.

## 후행 과제

- [x] Frontend runner-owned metric evidence fixtures/assertions moved in [[Frontend Worklog Metric Evidence Fixture Split 2026-06-18]].
- 다음 반복에서는 댓글/소셜 액션/알림 등 write-action response가 모두 `Ok/Data/List` envelope 계약을 일관되게 쓰는지 cross-repo로 검증한다.
- 서버/인프라/CICD/배포는 현재 goal 규칙에 따라 계속 보류한다.
