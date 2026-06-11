---
title: Publish Review Error Message Contract 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - backend
  - cli
  - contract
  - enterprise-hardening
status: done
related:
  - "[[Metric Evidence Collection Limit Contract 2026-06-11]]"
  - "[[Worklog Action Response Guard 2026-06-08]]"
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
---

# Publish Review Error Message Contract 2026-06-11

> [!summary]
> Fixed a Frontend/API error-message contract gap in publish/review mutations. Backend `ErrorResponse.error.message` is the user-visible failure copy, and Frontend now surfaces that message instead of replacing it with status-only generic text.

## Why

The cross-repo error-envelope audit found this mismatch:

- Backend returns strict error envelopes shaped as `{ error: { code, message, details } }`.
- CLI already parses the strict envelope and preserves specialized publish/share guidance.
- Frontend parsed `error.code` and `error.details`, but `ApiError.message` ignored backend `error.message` and rendered only status-based generic copy.

That meant publish/review failures such as `UNRESOLVED_PRIVACY_FINDING` could lose the actionable reason in UI surfaces that intentionally render `ApiError.message`.

## Changes

### Frontend

- `src/lib/api-error-diagnostics.contract.test.ts`
  - Added a regression case for a JSON error envelope from `worklogs.publish`.
  - Asserts that `ApiError.status`, `apiCode`, `diagnosticBody`, and user-facing `message` all preserve the backend contract appropriately.
- `src/lib/api-error.ts`
  - Extracted `ApiError`, `apiErrorCategory`, and `apiErrorDisplayMessage` from the transport module.
  - Uses parsed backend `error.message` as bounded user-visible copy when the strict envelope is valid.
  - Keeps generic/safe diagnostic fallback for non-envelope or non-JSON failures.
- `src/lib/api-transport.ts`
  - Re-exports the public error API so existing imports remain compatible.
  - Stays focused on transport/body/envelope parsing.

### Backend / CLI

- No source changes required.
- Backend error envelope tests and CLI error-boundary tests were rerun to verify the existing contract still matches the Frontend expectation.

## Verification

```bash
# Frontend
npm run test:contracts -- src/lib/api-error-diagnostics.contract.test.ts
npm run lint
npm test
# result: passed

# Backend
uv run pytest tests/test_error_contracts.py tests/test_worklog_publish_privacy_gate_contracts.py
# result: 9 passed, 1 existing Starlette/httpx deprecation warning

# CLI
npm test -- tests/api-non-json-error-diagnostics.test.ts tests/api-client-json-boundary.test.ts
# result: 2 files passed, 3 tests passed
```

> [!info]
> TypeScript LSP diagnostics could not run because `typescript-language-server` is not installed in the local LSP environment. `npm run lint` (`tsc --noEmit`) passed and was used as the authoritative type check.

## File-size review

| Repo | File | Pure LOC | Status |
| --- | --- | ---: | --- |
| Frontend | `src/lib/api-transport.ts` | 206 | Healthy after split |
| Frontend | `src/lib/api-error.ts` | 49 | Healthy |
| Frontend | `src/lib/api-error-diagnostics.contract.test.ts` | 81 | Healthy |

## Follow-up

- [ ] Continue cross-repo contract slices for review/update mutation response bodies.
- [ ] If more error UX behavior is added, keep it in `api-error.ts` instead of growing `api-transport.ts` again.
- [ ] Optionally install `typescript-language-server` locally so future LSP diagnostics can complement `tsc --noEmit`.
