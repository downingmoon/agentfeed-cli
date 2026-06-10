---
type: task
status: done
area: frontend
created: 2026-06-10
related:
  - "[[Enterprise Completion Audit]]"
  - "[[Frontend Search Filter Parser Guard 2026-06-10]]"
---

# Frontend Project Stats Parser Guard 2026-06-10

## Context

Frontend `src/lib/api.ts` still trusted `rawStats as BackendProjectStats` at project read/mutation boundaries. This was a production parser escape hatch: malformed backend stats could bypass the unknown-value API boundary until later adapter code.

## Changed

- `normalizeProjectStats` now accepts `unknown` and validates `stats` with `isRecord` before reading metric fields.
- Project mutation, summary, and detail normalizers now pass raw backend `stats` directly into the parser without `BackendProjectStats` type assertions.
- `projectMetricOrRaw` now works from `Record<string, unknown>` and validates each metric value through existing nullable non-negative integer guards.
- Added source contract guards that fail if `rawStats as BackendProjectStats` reappears or if project stats parsing stops accepting `unknown` at the boundary.

## Verification

- Red/green: `npm run test:contracts` first failed on the new source guard, then passed after implementation.
- `npm run lint` passed (`tsc --noEmit`).
- Local CI passed with DNS-less/local API flags: typecheck, production dependency audit, contract tests, mock API compatibility, production build.
- Dev OpenAPI contract gate passed from `agentfeed-dev`: 75 operations, 70 client contracts, 40 response field contracts.
- Browser smoke via MCP Playwright passed on local `/projects/downingmoon/agentfeed-cli` with mocked backend stats:
  - requested `/v1/users/downingmoon/projects/agentfeed-cli`
  - rendered Worklogs `4`, Tokens `12.3k`, Files `8`, `+220`, `-17`, Tests `6`, Commits `3`.
- LSP diagnostics could not run because local `typescript-language-server` is not installed; `npm run lint` is the replacement evidence for this pass.

## Not changed

- No backend/API schema changes.
- No deployment/server changes.
- `BackendUserStats` assertion remains a separate follow-up parser hardening candidate.

## Follow-up

- Harden public user stats parsing by removing `stats as BackendUserStats | null | undefined` from `normalizePublicUserForContract` in a separate pass.
