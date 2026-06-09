---
title: Multi Agent Evidence Agent Enum Guard
date: 2026-06-09
status: done
tags:
  - agentfeed
  - backend
  - frontend
  - contract
  - multi-agent
  - enterprise-readiness
related:
  - "[[Ingest Enum Metric Bounds Guard 2026-06-09]]"
  - "[[Direct Worklog Mutation Enum Guard 2026-06-09]]"
  - "[[Frontend Feed Category Contract Guard 2026-06-09]]"
---

# Multi Agent Evidence Agent Enum Guard 2026-06-09

## Context

CLI draft validation already treats `worklog.metrics.agent_metrics[].agent` and `source.agent` as canonical `AgentType` values:

- `claude_code`
- `codex`
- `cursor`
- `gemini_cli`
- `other`

Backend and Frontend still accepted non-empty arbitrary strings on some read-side evidence boundaries. That meant a future malformed API response could render or persist a legacy value such as `claude` even though CLI ingest rejects it.

> [!warning] Contract risk
> Multi-agent evidence is one of AgentFeed's core trust surfaces. If per-agent metrics accept arbitrary agent keys, Feed/Review UI can silently show mismatched labels or drop canonical grouping guarantees.

## Changes

### Backend

- `agentfeed-backend/app/schemas/worklog.py`
  - `WorklogSource.agent` now uses `AgentType`.
  - `AgentMetricSummary.agent` now uses `AgentType`.
  - `WorklogReviewSource.agent` now uses `AgentType`.
- `agentfeed-backend/tests/test_contracts.py`
  - Added regression coverage for unsupported `agent_metrics[].agent` values.
  - Added regression coverage for unsupported public/review source agents.

### Frontend

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiAgentMetricSummary.agent` and `ApiWorklogSource.agent` now use the exported `WorklogAgentType` union.
  - API response normalization now fails closed unless these fields match `WORKLOG_AGENT_TYPES`.
- `agentfeed-frontend/src/lib/adapters.ts`
  - Worklog card/detail adapter now rejects unsupported source and agent metric agents before rendering.
- `agentfeed-frontend/src/lib/collection-evidence.ts`
  - Review evidence helper now rejects unsupported `agent_metrics[].agent` values.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - Updated multi-agent fixture to canonical `claude_code`.
  - Added malformed response cases for legacy `claude` values.

## Deliberate non-change

`collection_sources[].name` remains a free non-empty string.

> [!info]
> Source names can represent plugin/session metadata such as `omx`, `omc`, `superpowers`, or future third-party tools. Restricting this field to `AgentType` would incorrectly block extensible collection evidence.

## Verification

- Backend targeted contract tests: `2 passed`.
- Backend full contract suite: `390 passed, 1 warning`.
- Frontend contract suite: `npm run test:contracts` passed.
- Frontend typecheck: `npm run lint` passed.
- Frontend production build: `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` passed.

## Follow-up

- Continue treating `AgentType` as the canonical identity for agent-owned work and per-agent metrics.
- Keep plugin/tool evidence extensible through `collection_sources[].name` and `agent_modes`.
- If legacy rows ever include `agent = claude`, migrate them to `claude_code` before tightening database-level constraints.
