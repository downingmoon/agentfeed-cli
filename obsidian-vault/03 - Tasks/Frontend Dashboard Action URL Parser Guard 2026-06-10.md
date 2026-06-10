---
title: Frontend Dashboard Action URL Parser Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - enterprise-hardening
aliases:
  - Dashboard action URL parser guard
---

# Frontend Dashboard Action URL Parser Guard 2026-06-10

## Context

Dashboard recent worklogs receive `action_url` from the backend and render it as the primary navigation target for draft, private, needs-review, and public rows. This is a route trust boundary: the frontend must reject external/unknown paths and must not coerce unchecked strings into internal route types.

`src/lib/api.ts` already rejected external and unknown routes, but still returned `value as ApiDashboardActionUrl` after validation.

## Changed

- Added a source contract guard in `src/lib/page-source-contract.test.ts` forbidding `return value as ApiDashboardActionUrl`.
- Updated `requireDashboardActionUrl` to parse `/worklogs/:id` and `/worklogs/:id/review` into a safe worklog segment.
- The parser now returns a reconstructed internal route rather than the original untyped input string.
- Query/hash-bearing worklog segments are rejected along with external/unknown routes.

## Verification

- Red contract confirmed: `npm run test:contracts` failed before implementation on the new dashboard action URL assertion guard.
- Green contract: `npm run test:contracts` passed.
- Typecheck: `npm run lint` passed.
- Full frontend CI: DNS-less `npm run ci` passed.
- Cross-repo OpenAPI gate: `node scripts/check-openapi-contract.mjs` passed in `agentfeed-dev`.
- UI smoke: mocked `/dashboard` rendered recent rows and produced safe hrefs:
  - `http://127.0.0.1:3107/worklogs/draft%2Fid/review`
  - `http://127.0.0.1:3107/worklogs/published-id`
- LSP diagnostics were unavailable because `typescript-language-server` is not installed locally; `tsc --noEmit` covered type validation.

## Deployment

No server deployment was performed. Current goal explicitly keeps server/infra/CICD work on hold.

## Follow-ups

- [[Frontend Integration Type Parser Cleanup]]: setup-guide type parser can be tightened further.
- [[Frontend Worklog Author View Model Assertion Cleanup]]: `_author` view-model augmentation currently uses assertions and should be replaced with an explicit composed type.
- [[Frontend Public User Stats Normalization Cleanup]]: remaining `BackendProjectStats` assertion in `api.ts` should be removed in a focused parser pass.
