---
title: Collection Evidence Strict Agent Metrics Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - contracts
  - worklog-review
  - multi-agent
status: done
related:
  - "[[Notification Target Strict Payload Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Collection Evidence Strict Agent Metrics Guard 2026-06-09

> [!success]
> Worklog review evidence helper no longer spreads/casts agent metric payloads. Per-agent evidence is now constructed from explicitly validated fields only.

## Why

이전 pass의 follow-up은 Frontend adapter/helper에서 API payload spread 또는 index-signature 패턴이 계약 drift를 숨길 수 있는지 계속 스캔하는 것이었다. 스캔 결과 `src/lib/collection-evidence.ts`의 `assertAgentMetric()`이 `...(value as unknown as ApiAgentMetricSummary)`로 row 전체를 통과시키고 있었다.

이 helper는 review 화면에서 multi-agent 작업의 models/tokens/tool calls/commands 등을 표시하는 신뢰 근거이므로, stringified number나 raw/internal payload가 조용히 UI에 들어오면 Enterprise-grade 계약 보장에 맞지 않는다.

## What changed

- `assertAgentMetric()`
  - raw object spread 제거.
  - `agent`, `model`, `session_id`, numeric metrics, `agent_modes`를 모두 명시 검증 후 새 object로 구성.
  - `tokens_used`, `commands_run`, `tool_calls` 등 numeric fields는 `non-negative number | null`만 허용.
  - 예상 밖 field는 `Frontend collection evidence contract mismatch`로 fail-closed.
- `assertCollectionSource()`
  - `type`, `name`, `quality` 외 field를 fail-closed.
- Frontend contract tests
  - string token count
  - unexpected agent metric raw payload
  - unexpected collection source raw payload
  - 위 케이스가 모두 collection evidence contract mismatch로 실패하는지 고정.

## Verification

- Frontend contract tests:
  - `npm test -- src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts`
  - Result: passed.
- Frontend typecheck/lint:
  - `npm run lint`
  - Result: passed.
- Risk-pattern rescan:
  - `rg "\.\.\.\(value as unknown as ApiAgentMetricSummary\)|unknown as ApiAgentMetricSummary|\[extraKey: string\]" src/lib/collection-evidence.ts src/lib/api.ts`
  - Result: no matches.
- Dev OpenAPI gate:
  - `node --check scripts/check-openapi-contract.mjs`
  - `node scripts/check-openapi-contract.mjs`
  - Result: passed.

## Follow-up

> [!todo]
> Continue scanning remaining Frontend helper/adapters for broad casts such as `as unknown as Api*` that are not immediately preceded by strict field validation.

> [!info]
> 서버/인프라/CICD/개인서버 배포는 active goal 규칙에 따라 수행하지 않았다.
