---
title: Frontend Search Filter Parser Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - enterprise-hardening
aliases:
  - Search filter parser guard
---

# Frontend Search Filter Parser Guard 2026-06-10

## Context

The search page reads `type` from the URL and sends it to the backend search API. This is a user-controlled query param, so it must be narrowed to the closed frontend/backend search filter union before becoming an API request parameter.

`SearchPage.tsx` previously used `value as SearchFilter` after checking against the filter list.

## Changed

- Added source contract checks in `src/lib/page-source-contract.test.ts` to forbid `value as SearchFilter`.
- Replaced the membership-check cast with a closed `switch` in `normalizeFilter`.
- Invalid filter values now keep the existing behavior: fallback to `all` and omit `type` from the API request.
- Valid filter values continue to preserve the backend query type.

## Verification

- Red contract confirmed: `npm run test:contracts` failed before implementation on the new search filter assertion guard.
- Green contract: `npm run test:contracts` passed.
- Typecheck: `npm run lint` passed.
- Full frontend CI: DNS-less `npm run ci` passed.
- Cross-repo OpenAPI gate: `node scripts/check-openapi-contract.mjs` passed in `agentfeed-dev`.
- UI smoke: mocked `/search` confirmed:
  - `/search?q=agentfeed&type=invalid` requests `/v1/search?q=agentfeed` and activates All.
  - `/search?q=agentfeed&type=projects` requests `/v1/search?q=agentfeed&type=projects` and activates Projects.
- LSP diagnostics were unavailable because `typescript-language-server` is not installed locally; `tsc --noEmit` covered type validation.

## Deployment

No server deployment was performed. Current goal explicitly keeps server/infra/CICD work on hold.

## Follow-ups

- [[Frontend Public User Stats Normalization Cleanup]]: remaining `BackendProjectStats` assertion in `api.ts` should be removed in a focused parser pass.
- [[Frontend Feed Worklog Author Type Adoption]]: feed-local `FeedWorklog = Worklog & { _author?: User }` can be replaced with `WorklogAuthorView` or `WorklogWithAuthor` where appropriate.
- [[Frontend Test Fixture Cast Cleanup]]: test-only `as unknown as` malformed fixture casts should be reviewed separately from production parser cleanup.
