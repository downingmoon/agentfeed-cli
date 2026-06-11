---
title: Frontend CLI Auth Exchange Contract 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - backend
  - contract
  - cli-auth
status: done
---

# Frontend CLI Auth Exchange Contract 2026-06-11

## Context

Backend exposes `POST /v1/auth/cli/sessions/{session_id}/exchange` and returns `DataResponse[CliAuthExchangeResponse]`. Frontend API-layer coverage already modeled CLI auth `session` and `approve`, but it did not expose or parse the `exchange` response contract.

This was a CLI-Frontend-Backend contract parity gap: the route exists in Backend and is part of the CLI auth flow, but Frontend's shared API surface could not typecheck or fail closed against that response shape.

## Changed

- Added strict Frontend parser/type coverage for CLI auth exchange responses in `src/lib/api-cli-auth.ts`:
  - `CliAuthExchangeResult`
  - `CliAuthExchangeUser`
  - `normalizeCliAuthExchangeResult`
- Added `cliAuth.exchange(sessionId, verifier)` to `src/lib/api-system-auth-client.ts`.
- Exported exchange types through `src/lib/api.ts`.
- Extended `src/lib/cli-auth.contract.ts` with:
  - happy-path exchange request URL/body assertions
  - strict response parser assertions
  - malformed exchange response fail-closed cases

## Verification

> [!success]
> Red/green verification and full local Frontend checks passed. No server deployment was performed.

- Red check: `npm test` failed before implementation with `Property 'exchange' does not exist on type ...`.
- Frontend contract tests: `npm test` passed.
- Frontend typecheck: `npm run lint` passed.
- Frontend production build: `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` passed.
- Backend counterpart: `uv run pytest tests/test_cli_auth_exchange_contracts.py tests/test_cli_auth_session_contracts.py -q` → 12 passed.
- Hygiene: `git diff --check` passed; changed Frontend files remain under 250 pure LOC.
- LSP caveat: TypeScript LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc` passed through `npm run lint` and Next build.

## Follow-up

- Review whether Frontend should also model Backend ingest preview API as a shared API-layer contract, or whether that remains CLI-only and should be documented as intentionally absent.
- Review CLI auth exchange rotation fields (`rotated_from`, `rotated_at`) against Backend route behavior. Backend schema permits each as optional nullable; route behavior currently emits both together when rotation occurs.
