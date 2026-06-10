---
title: Frontend Collection Evidence Agent Parser Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - enterprise-hardening
aliases:
  - Collection evidence agent parser guard
---

# Frontend Collection Evidence Agent Parser Guard 2026-06-10

## Context

The review page collection evidence panel is part of the core multi-agent trust surface. It renders collected model names, per-agent metrics, token counts, commands, tool calls, and source quality for a worklog before publish.

During the enterprise-hardening pass, `src/lib/collection-evidence.ts` still used TypeScript assertions to coerce untrusted collection evidence into backend-aligned agent and mode types.

## Changed

- Added source contract checks in `agentfeed-frontend/src/lib/page-source-contract.test.ts` to prevent regression to assertion-based collection evidence parsing.
- Replaced `WORKLOG_AGENT_TYPES.includes(value as ApiAgentMetricSummary['agent'])` with an exhaustive `switch` over the backend agent union.
- Routed `agent_metrics[].agent_modes` through the shared non-empty string array parser instead of `rawModes as string[] | null`.

## Verification

- Red contract confirmed: `npm run test:contracts` failed before implementation on the new assertion guard.
- Green contract: `npm run test:contracts` passed.
- Typecheck: `npm run lint` passed.
- Full frontend CI: DNS-less `npm run ci` passed.
- Cross-repo OpenAPI gate: `node scripts/check-openapi-contract.mjs` passed in `agentfeed-dev`.
- UI smoke: mocked `/worklogs/review-smoke/review` rendered both `codex / gpt-5.5` and `claude_code / claude-sonnet-4.6` in `Agent metric breakdown`.
- LSP diagnostics were unavailable because `typescript-language-server` is not installed locally; `tsc --noEmit` covered type validation.

## Deployment

No server deployment was performed. Current goal explicitly keeps server/infra/CICD work on hold.

## Follow-ups

- [[Frontend Adapters Assertion Cleanup]]: remaining assertions in `src/lib/adapters.ts` should be converted to parse-at-boundary helpers.
- [[Frontend API Internal Route Type Cleanup]]: `ApiDashboardActionUrl` still uses an assertion after runtime path validation.
- [[Frontend Integration Type Parser Cleanup]]: setup-guide type parser can be tightened further without assertions.
