---
title: Client Error Display Audit 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - cli
  - frontend
  - api-contract
  - error-response
  - ux
status: done
related:
  - "[[CLI ErrorResponse Envelope Strict Guard 2026-06-09]]"
  - "[[Frontend ErrorResponse Envelope Strict Guard 2026-06-09]]"
  - "[[Unknown Route ErrorResponse Envelope 2026-06-09]]"
  - "[[Trusted Host ErrorResponse Envelope 2026-06-09]]"
---

# Client Error Display Audit 2026-06-09

## Summary

After Backend error responses were hardened to strict `ErrorResponse` envelopes, CLI and Frontend error rendering were re-audited for common statuses: `400`, `404`, `429`, and `500`.

Decision: no code change in this pass.

## Findings

### CLI

CLI already parses strict backend `ErrorResponse` envelopes and maps them through `friendlyError` before displaying failures.

Relevant behavior:

- `401` / invalid ingestion token: gives concrete rotation guidance.
- `413`: says the local draft was kept and payload is too large.
- `422`: includes validation context.
- `429`: includes retry-after seconds when present.
- `409`: includes duplicate review URL when present.
- `5xx`: uses a safe server-error message and preserves local draft state.
- Other statuses fall back to the backend `error.message` after the envelope shape is validated.

This is appropriate for CLI because it is task-oriented and often needs recovery commands.

### Frontend

Frontend intentionally keeps `ApiError.message` status-based and generic for user-facing UI:

- `400`: request could not be processed.
- `401`: sign in.
- `403`: no permission.
- `404`: resource not found.
- `409`: refresh/retry conflict.
- `422`: invalid submitted fields.
- `429`: wait and retry.
- `5xx`: service temporarily unavailable.

The raw response body and parsed backend fields are retained separately as diagnostics:

- `diagnosticBody`
- `apiCode`
- `apiErrorMessage`
- `apiDetails`

This avoids accidentally rendering backend/proxy diagnostic text to end users while still allowing page-level logic to branch on status/category and diagnostics when needed.

## Verification evidence

Already covered in the current cross-repo run:

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
bash scripts/test-all.sh
```

Evidence from that run:

- CLI tests: `28 passed`, `591 passed`.
- CLI release preflight: passed.
- Frontend typecheck, contract tests, mock API compatibility, production build: passed.
- Backend full suite: `428 passed, 1 warning`.
- OpenAPI contract gate: passed with `Strict client JSON error responses checked: 347`.

## Not done

- No server deployment was performed; infra/deploy remains intentionally on hold for this goal.
- No new UI copy helper was added because the current generic Frontend message policy is safer and already tested.

## Follow-ups

- [[Frontend Error Copy Policy]]: if the product later wants more specific page-level messages, add a small allowlisted copy mapper keyed by `ApiError.category` + safe `apiCode`, not raw `apiErrorMessage`.
- [[CLI Error Copy Matrix]]: keep CLI recovery copy command-oriented and ensure any new backend error codes map to an actionable command or safe fallback.
