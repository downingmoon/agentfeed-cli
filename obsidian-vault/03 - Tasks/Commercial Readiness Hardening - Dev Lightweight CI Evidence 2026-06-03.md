---
title: Commercial Readiness Hardening - Dev Lightweight CI Evidence 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/dev
  - agentfeed/ci
status: done
aliases:
  - Dev Lightweight CI Evidence 2026-06-03
---

# Commercial Readiness Hardening - Dev Lightweight CI Evidence 2026-06-03

## Decision

`agentfeed-dev` now has a lightweight push/pull_request CI workflow for orchestration contracts. This separates always-runnable repository validation from manual hosted/commercial readiness workflows that require secrets, self-hosted runners, or deployed DNS.

The workflow validates:

- all local shell scripts with `bash -n`
- workflow validity contracts via `scripts/test-workflow-validity.sh`
- Docker Compose configuration with `.env.example`

> [!success] Verification
> - RED: `./scripts/test-workflow-validity.sh` failed because `.github/workflows/ci.yml` did not exist.
> - GREEN: `./scripts/test-workflow-validity.sh`
> - Local CI mirror: `for script in scripts/*.sh; do bash -n "$script"; done; docker compose --env-file .env.example config --quiet`

## Scope

- Dev orchestration repo: `.github/workflows/ci.yml`, `scripts/test-workflow-validity.sh`
- Vault documentation: this note

## Remaining hosted blocker

Frontend hosted readiness is still blocked by deployment/DNS evidence, not by this dev CI change:

- `api.agentfeed.dev` does not resolve.
- `https://agentfeed.dev/` root redirects to `/login` with HTTP `307`.

