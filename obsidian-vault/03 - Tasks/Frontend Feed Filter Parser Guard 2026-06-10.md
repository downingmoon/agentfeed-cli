---
type: task
status: done
area: frontend
created: 2026-06-10
related:
  - "[[Enterprise Completion Audit]]"
  - "[[Frontend Public User Stats Parser Guard 2026-06-10]]"
---

# Frontend Feed Filter Parser Guard 2026-06-10

## Context

Feed sort/time filters received string values from the shared `FilterGroup` UI and converted them with `value as FeedSortLabel` / `value as FeedTimeLabel`. The options are controlled, but this still made the UI event boundary assertion-based instead of closed-parser based.

## Changed

- Added `feedSortLabelFromFilterValue` and `feedTimeLabelFromFilterValue` closed parsers in `FeedPage`.
- Sort/time filter handlers now no-op on impossible values instead of asserting that every incoming string is valid.
- Added source contract guards preventing `value as FeedSortLabel` and `value as FeedTimeLabel` regressions.

## Verification

- Red/green: `npm run test:contracts` failed on the new source guard, then passed after implementation.
- `npm run lint` passed (`tsc --noEmit`).
- Local CI passed with DNS-less/local API flags: typecheck, production dependency audit, contract tests, mock API compatibility, production build.
- Dev OpenAPI contract gate passed from `agentfeed-dev`: 75 operations, 70 client contracts, 40 response field contracts.
- Browser smoke via MCP Playwright passed on local `/feed` with mocked backend:
  - selected sort `Trending` and time `전체`
  - final URL: `/feed?sort=trending&time_range=all`
  - final API request: `/v1/feed?sort=trending&time_range=all&limit=20`.
- LSP diagnostics could not run because local `typescript-language-server` is not installed; `npm run lint` is the replacement evidence for this pass.

## Not changed

- No backend/API schema changes.
- No deployment/server changes.
- Existing dev-mode CSP console noise from Next devtools was observed during browser smoke, unrelated to this filter parser change.

## Follow-up

- Remaining frontend assertions should be triaged by risk: generic API response helpers, auth compatibility metadata record reads, and non-contract style assertions such as CSSProperties.
