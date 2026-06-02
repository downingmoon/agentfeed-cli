---
title: Commercial Readiness Hardening - CLI Handoff Policy and Backend Private DNS Guard 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/security
  - agentfeed/runtime-config
  - agentfeed/commercial-readiness
status: completed
aliases:
  - CLI handoff policy and backend private DNS guard
  - Review URL handoff trust policy
  - Backend private DNS production guard
---

# CLI handoff policy and backend private DNS guard

> [!success]
> CLI upload/share/publish review URL handoff now re-checks the same trusted review URL policy at the clipboard/browser side-effect boundary, and Backend production settings now reject private/internal DNS hostnames for public-facing URL/Host config.

## Context

- 상위 목표: [[Active Tasks#P1 후보]]
- CLI trust boundary: [[Auth & Credential Safety]]
- Runtime config: [[Runtime Configuration]]
- Cross-repo integration: [[Integration - CLI Backend Frontend]]

## Problem

### CLI review URL handoff side-effect boundary

`agentfeed open` already validates saved review URLs before opening a browser, and `publishDraft` response parsing validates upload responses. However the local handoff helper itself still called clipboard/browser helpers without a local policy check. That left a future regression path where stale/malformed local data or a refactor could trigger side effects without the same trust-policy diagnostic.

> [!warning]
> Existing parsing made the immediate exploit path narrow, but commercial security posture benefits from policy enforcement at the side-effect boundary, not only at upstream parsing.

### Backend private/internal DNS config

Backend production startup validated public-facing config against localhost/private IP addresses, but ordinary DNS hostnames were accepted if they were not parseable as IP addresses. That allowed values such as `https://api.internal`, `https://frontend.local`, or `API_ALLOWED_HOSTS=*.corp` in production-facing OAuth/CORS/Host settings.

> [!warning]
> Database hosts may legitimately be internal; this guard is intentionally limited to public-facing `GITHUB_REDIRECT_URI`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, and `API_ALLOWED_HOSTS`.

## Contract

1. CLI `handoffReviewUrl()` calls `isTrustedReviewUrl()` before `copyToClipboard()` or `openBrowser()`.
2. Every CLI upload/share/publish handoff call passes the active `creds.api_base_url` into the handoff policy.
3. Policy-rejected handoffs report `Review URL was rejected by trust policy` and mark requested channels as `ok: false` without clipboard/browser side effects.
4. Backend production settings reject private DNS suffixes for public URL/host config:
   - `.internal`
   - `.local`
   - `.localhost`
   - `.corp`
   - `.lan`
   - `.home`
   - `.intranet`
5. Existing public HTTPS production settings remain accepted.

## Changes

### CLI

- `src/cli/index.ts`
  - Added a policy-aware rejection branch in `handoffReviewUrl()`.
  - Added `apiBaseUrl` to the handoff options.
  - Propagated `creds.api_base_url` from collect JSON upload, share JSON/human upload, and publish JSON/human upload.
- `tests/cli-handoff-policy.test.ts`
  - New source contract proving the policy check precedes clipboard/browser calls.
  - New source contract proving all upload handoff call sites pass active API base context.

### Backend

- `app/config.py`
  - Added `PRIVATE_DNS_SUFFIXES` and `_is_private_dns_hostname()`.
  - Applied private DNS rejection to public HTTPS URL and API host validation.
  - Also aligned helper public URL/host predicates with the private-DNS classifier.
- `tests/test_contracts.py`
  - Added `test_production_settings_reject_private_dns_hosts()`.

## Verification evidence

> [!example] RED — CLI handoff policy
> `npm test -- tests/cli-handoff-policy.test.ts` failed because `handoffReviewUrl()` did not contain `isTrustedReviewUrl`, and upload handoff calls did not pass `apiBaseUrl`.

> [!success] GREEN — CLI targeted
> `npm test -- tests/cli-handoff-policy.test.ts` passed after adding policy-aware handoff and API-base propagation.

> [!success] GREEN — CLI full release gate
> `npm test && npm run typecheck && npm run release:preflight && npm audit --audit-level=moderate` passed with 329 tests and 0 audit vulnerabilities.

> [!example] RED — Backend private DNS
> `uv run --locked pytest tests/test_contracts.py -q -k 'production_settings_reject_private_dns_hosts'` failed because `GITHUB_REDIRECT_URI=https://api.internal/...` did not raise.

> [!success] GREEN — Backend targeted
> `uv run --locked pytest tests/test_contracts.py -q -k 'production_settings_reject_private_dns_hosts or production_settings_accept_explicit_secure_urls or production_settings_reject_localhost_urls'` passed.

> [!success] GREEN — Backend full
> `uv run --locked ruff check . && uv run --locked pytest -q` passed with 290 tests and one existing Starlette/httpx deprecation warning.

## Remaining risk

> [!warning]
> This loop closes local policy/config gaps. It does not resolve the external hosted DNS/deployment blocker for `api.agentfeed.dev`, and CLI handoff runtime side effects are still mostly covered by source-contract plus existing safe/failing handoff integration tests rather than a direct malicious URL runtime path, because upstream upload parsing already rejects malicious URLs.

## Follow-up candidates

> [!todo]
> If the CLI grows more side-effect helpers, extract handoff policy into a small pure module with direct unit tests instead of source-contract tests.

> [!todo]
> Consider whether production public-host validation should also reject additional reserved/special-use TLDs once official deployment domain policy is finalized.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
