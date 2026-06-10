---
type: task
status: done
area: frontend
created: 2026-06-10
related:
  - "[[Enterprise Completion Audit]]"
  - "[[Frontend Project Stats Parser Guard 2026-06-10]]"
---

# Frontend Public User Stats Parser Guard 2026-06-10

## Context

Public user payloads were already normalized through `normalizePublicUserForContract`, but nested `stats` still crossed the API boundary through `stats as BackendUserStats | null | undefined`. That kept a neighboring assertion next to the project stats parser hardening and weakened the fail-closed API contract posture.

## Changed

- `normalizeUserStats` now accepts `unknown` and validates present stats with `isRecord` before reading values.
- `userMetricOrRaw` now reads from `Record<string, unknown>` and keeps all numeric validation in `nullableNonNegativeIntegerValueForContract`.
- `normalizePublicUserForContract` passes raw `stats` directly to the parser without a `BackendUserStats` assertion.
- Added source contract guards preventing the assertion from returning and requiring the user stats parser to accept `unknown` at the boundary.

## Verification

- Red/green: `npm run test:contracts` failed on the new source guard, then passed after implementation.
- `npm run lint` passed (`tsc --noEmit`).
- Local CI passed with DNS-less/local API flags: typecheck, production dependency audit, contract tests, mock API compatibility, production build.
- Dev OpenAPI contract gate passed from `agentfeed-dev`: 75 operations, 70 client contracts, 40 response field contracts.
- Browser smoke via MCP Playwright passed on local `/profile/downingmoon` with mocked backend public user stats:
  - requested `/v1/users/downingmoon`, `/v1/users/downingmoon/worklogs`, `/v1/users/downingmoon/projects`, `/v1/users/downingmoon/activity`
  - rendered `@downingmoon`, `7 total`, `123.5k`, `15`, `+901`, `44`, `5`.
- LSP diagnostics could not run because local `typescript-language-server` is not installed; `npm run lint` is the replacement evidence for this pass.

## Not changed

- No backend/API schema changes.
- No deployment/server changes.
- Existing dev-mode CSP console noise from Next devtools was observed during browser smoke, unrelated to this parser change.

## Follow-up

- Continue scanning remaining frontend source guards for assertion-based API boundary escapes before expanding scope to backend/CLI hardening.
