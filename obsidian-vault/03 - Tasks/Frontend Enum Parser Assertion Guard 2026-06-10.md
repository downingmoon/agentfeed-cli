---
type: task
status: done
area: frontend
created: 2026-06-10
related:
  - "[[Enterprise Completion Audit]]"
  - "[[Frontend Feed Filter Parser Guard 2026-06-10]]"
---

# Frontend Enum Parser Assertion Guard 2026-06-10

## Context

Frontend API enum helpers still narrowed backend strings with assertion-based membership checks:

- `values.includes(value as T)` / `return value as T` in worklog action and shared contract enum parsers.
- `value as CliAuthSessionStatus` in CLI auth session status parsing.

These were small but central contract escape hatches because many backend enum fields pass through these helpers before reaching UI surfaces.

## Changed

- Added shared `isOneOfString<T extends string>` type guard that checks closed string unions without type assertions.
- Updated worklog action `requireOneOf` and shared `requireOneOfForContract` to return values narrowed by the guard.
- Replaced `Set<CliAuthSessionStatus>` status narrowing with a readonly closed status list and reused `requireOneOfForContract`.
- Added source contract guards preventing generic enum assertion checks and CLI auth status assertions from returning.

## Verification

- Red/green: `npm run test:contracts` failed on the new source guard, then passed after implementation.
- `npm run lint` passed (`tsc --noEmit`).
- Local CI passed with DNS-less/local API flags: typecheck, production dependency audit, contract tests, mock API compatibility, production build.
- Dev OpenAPI contract gate passed from `agentfeed-dev`: 75 operations, 70 client contracts, 40 response field contracts.
- Browser smoke via MCP Playwright passed on local `/cli/authorize?session_id=session-1&status_token=status-token-1` with mocked pending CLI session:
  - requested `/v1/auth/cli/sessions/session-1?status_token=status-token-1`
  - rendered `CLI 세션`, `Codex terminal`, `승인 대기 중`, `GitHub로 계속하기`.
- LSP diagnostics could not run because local `typescript-language-server` is not installed; `npm run lint` is the replacement evidence for this pass.

## Not changed

- No backend/API schema changes.
- No deployment/server changes.
- Existing dev-mode CSP console noise from Next devtools remains unrelated to this parser hardening.

## Follow-up

- Triage remaining assertions by risk: generic API response parsing helpers, AppContext metadata record reads, adapter-internal record assertions, and UI-only style assertions.
