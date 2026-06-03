---
title: Commercial Readiness Hardening - OAuth Contract Smoke Status Token
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/dev-stack
  - agentfeed/cli-auth
  - testing/smoke
status: verified
aliases:
  - OAuth Contract Smoke Status Token 2026-06-03
---

# Commercial Readiness Hardening - OAuth Contract Smoke Status Token

Related: [[Commercial Readiness Hardening - CLI Authorize Source Contracts 2026-06-03]] · [[Commercial Readiness Hardening - Ingestion Context Row Locks 2026-06-03]] · [[Home]]

## Outcome

The credential-free OAuth contract smoke now follows the real CLI authorize URL shape:

- Parses `status_token` from the backend-generated `authorize_url`.
- Sends OAuth `next=/cli/authorize?session_id=...&status_token=...` to mirror `agentfeed login` browser handoff.
- Asserts the GitHub redirect leaks neither `session_id` nor `status_token`.
- Asserts OAuth state/callback sanitizes back to `/cli/authorize`.
- Uses `status_token` when checking approved/consumed CLI session status.

Backend unit contract coverage now explicitly includes `status_token` in OAuth next-state stripping cases.

> [!success] Commercial-readiness impact
> The no-credential OAuth contract smoke now guards the same one-time CLI session lookup-token semantics used by the browser login flow.

## Verification Evidence

```bash
./.venv/bin/pytest tests/test_contracts.py -k "github_oauth_next_state_strips_untrusted_query_and_hash_values or github_oauth_state_requires_cookie_bound_signature" -q
```

Result: `7 passed, 331 deselected`.

```bash
bash -n scripts/smoke-oauth-contract.sh && bash -n scripts/test-all.sh && ./scripts/test-all.sh
```

Result: passed. Included:

- AgentFeed CLI: `23 passed`, `386 passed` and release preflight passed.
- Frontend local CI: typecheck, audit, contracts, mock API compatibility, production build passed.
- Backend: `362 passed, 1 warning`; Alembic offline migration chain reached `027_browser_session_version`.

```bash
docker compose --env-file .env -f compose.yaml exec -T backend sh -lc 'if [ -x .venv/bin/alembic ]; then .venv/bin/alembic upgrade head; else alembic upgrade head; fi'
```

Result: dev DB migrated from `025_report_moderation_constraints` to `027_browser_session_version` after readiness reported migration drift.

```bash
bash scripts/smoke-oauth-contract.sh
```

Result: `OAUTH_CONTRACT_SMOKE_PASSED`.

## Remaining External Blocker

> [!warning] Hosted strict readiness
> Production hosted readiness is still externally blocked by `api.agentfeed.dev` DNS resolution and `https://agentfeed.dev/` root redirecting to `/login`.
