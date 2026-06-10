---
title: Frontend Adapters Source Parser Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - enterprise-hardening
aliases:
  - Frontend adapters source parser guard
---

# Frontend Adapters Source Parser Guard 2026-06-10

## Context

`src/lib/adapters.ts` hydrates normalized API worklogs into frontend view models. This sits on the public worklog detail path, so it must not silently coerce malformed source evidence into trusted UI state.

The adapter still used assertions for three source evidence fields:

- `WORKLOG_AGENT_TYPES.includes(value as ApiWorklogSource['agent'])`
- `quality as ApiWorklogSource['collection_quality']`
- `reason as ApiWorklogSource['collection_window_reason']`

## Changed

- Extended `src/lib/adapters-source-contract.test.ts` to forbid those assertion patterns.
- Replaced assertion-based agent membership with an exhaustive agent parser.
- Added explicit parsers for nullable `collection_quality` and `collection_window_reason`.
- Kept behavior fail-closed: malformed source evidence raises a visible adapter contract error rather than being coerced.

## Verification

- Red contract confirmed: `npm run test:contracts` failed before implementation on the new adapter assertion guard.
- Green contract: `npm run test:contracts` passed.
- Typecheck: `npm run lint` passed.
- Full frontend CI: DNS-less `npm run ci` passed.
- Cross-repo OpenAPI gate: `node scripts/check-openapi-contract.mjs` passed in `agentfeed-dev`.
- UI smoke: mocked `/worklogs/detail-smoke` rendered the detail page with multi-model evidence, `Collection high`, `Sources OMX`, and `Fingerprint abcdef123456`.
- LSP diagnostics were unavailable because `typescript-language-server` is not installed locally; `tsc --noEmit` covered type validation.

## Deployment

No server deployment was performed. Current goal explicitly keeps server/infra/CICD work on hold.

## Follow-ups

- [[Frontend API Internal Route Type Cleanup]]: `ApiDashboardActionUrl` still uses a post-validation assertion.
- [[Frontend Integration Type Parser Cleanup]]: setup-guide type parser can be tightened further.
- [[Frontend Worklog Author View Model Assertion Cleanup]]: `_author` view-model augmentation currently uses assertions and should be replaced with an explicit composed type.
