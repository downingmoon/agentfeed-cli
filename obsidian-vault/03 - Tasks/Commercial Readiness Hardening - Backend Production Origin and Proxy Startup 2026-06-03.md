---
title: Backend Production Origin and Proxy Startup
date: 2026-06-03
tags:
  - agentfeed
  - backend
  - commercial-readiness
  - runtime-config
  - security
status: completed
---

# Backend Production Origin and Proxy Startup

## Context

Backend read-only audit found two production-readiness gaps that affect CLI/Frontend integration directly:

- `FRONTEND_URL` / `ALLOWED_ORIGINS` accepted public HTTPS URLs with path, query, fragment, or credentials.
- `scripts/start-production.sh` did not pass uvicorn proxy header flags, even though rate-limit identity supports `TRUSTED_PROXY_IPS`.

> [!warning]
> These are deploy-time correctness issues: malformed frontend origins can break CORS, CSRF allowlisting, CLI authorize URLs, ingest review URLs, and `/v1/metadata.review_base_url`; missing proxy flags can weaken source identity behind load balancers.

## Changes

- Backend production settings now require `FRONTEND_URL` and each `ALLOWED_ORIGINS` entry to be exact public HTTPS origins.
- Path, params, query, fragment, username, and password are rejected outside development for frontend/review origins.
- Production start script now runs uvicorn with `--proxy-headers` and `--forwarded-allow-ips "$FORWARDED_ALLOW_IPS"`.
- `FORWARDED_ALLOW_IPS` defaults to `TRUSTED_PROXY_IPS` or `127.0.0.1`.
- README documents exact-origin and proxy startup expectations.

## Verification evidence

```bash
uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k "startup_artifacts or reject_frontend_origin or reject_allowed_origin"
uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k "production_settings or startup_artifacts or api_metadata"
uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q
uv run --python 3.12 --locked --group dev pytest -q
```

Results:

- New TDD guard: 9 passed.
- Production settings/startup/metadata targeted suite: 17 passed.
- Backend contract suite: 329 passed.
- Full Backend tests: 353 passed.

Hosted blocker remains external:

```bash
dig +short api.agentfeed.dev
curl -fsS --max-time 10 https://api.agentfeed.dev/v1/metadata
```

Result: `curl: (6) Could not resolve host: api.agentfeed.dev`.

## Related notes

- [[Commercial Readiness Hardening - Metadata Review URL Trust 2026-06-03]]
- [[Commercial Readiness Hardening - Backend Production Deploy Contract 2026-06-02]]
- [[Runtime Configuration]]
