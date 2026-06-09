---
title: Backend Error Contract Test Split 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - cli
  - tests
  - api-contract
  - error-response
  - refactor
status: done
related:
  - "[[Backend System Routes Module Split 2026-06-09]]"
  - "[[Backend OpenAPI Contract Module Split 2026-06-09]]"
  - "[[Unknown Route ErrorResponse Envelope 2026-06-09]]"
  - "[[Trusted Host ErrorResponse Envelope 2026-06-09]]"
---

# Backend Error Contract Test Split 2026-06-09

> [!success] Result
> Error/common response contract tests now live in a focused backend test file, and the cross-repo verification suite is stable under the current local full-suite workload.

## What changed

### Backend

- Split independent strict error/common envelope coverage out of `tests/test_contracts.py` into `tests/test_error_contracts.py`.
- Moved 6 tests:
  - `test_common_success_and_error_response_payloads_are_strict`
  - `test_common_response_envelopes_reject_extra_fields`
  - `test_client_visible_error_responses_use_strict_error_envelope`
  - `test_health_and_readiness_status_contracts_are_closed`
  - `test_trusted_host_middleware_rejects_unknown_hosts_with_error_envelope`
  - `test_unknown_route_returns_error_envelope`
- Size movement:
  - `tests/test_contracts.py`: 9,868 → 9,680 pure LOC.
  - `tests/test_error_contracts.py`: 190 pure LOC.

### CLI test stability

- During cross-repo verification, the full parallel CLI Vitest suite exposed timeout flakes in subprocess/git/collector-heavy tests.
- Stabilized the test budget without changing product behavior:
  - `vitest.config.ts` default `testTimeout`: 20s → 60s.
  - Explicit slow integration timeouts in:
    - `tests/draft-agent-detection-warning.test.ts`
    - `tests/git-draft.test.ts`
    - `tests/session-collector.test.ts`
- Rationale: individual tests and focused groups passed, but full-suite parallel execution was slower due subprocess/git workload. The failure mode was timeout-only, not assertion failure.

## Verification evidence

- Backend targeted pre-split behavior check:
  - `uv run --locked --group dev pytest tests/test_contracts.py -k 'common_success_and_error_response_payloads_are_strict or common_response_envelopes_reject_extra_fields or client_visible_error_responses_use_strict_error_envelope or health_and_readiness_status_contracts_are_closed or trusted_host_middleware_rejects_unknown_hosts_with_error_envelope or unknown_route_returns_error_envelope'`
  - Result: 6 passed.
- Backend split-file check:
  - `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_error_contracts.py`
  - Result: passed.
  - `uv run --locked --group dev pytest tests/test_error_contracts.py`
  - Result: 6 passed, 1 warning.
- Backend full suite:
  - `uv run --locked --group dev pytest`
  - Result: 428 passed, 1 warning.
- CLI focused timeout regression check:
  - `npm run test -- tests/draft-agent-detection-warning.test.ts tests/git-draft.test.ts tests/session-collector.test.ts --run`
  - Result: 89 passed.
  - `npm run test -- tests/cli-help.test.ts --run`
  - Result: 38 passed.
- CLI full suite:
  - `npm run typecheck`
  - Result: passed.
  - `npm run test -- --run`
  - Result: 28 files passed, 591 tests passed.
- Cross-repo contract gate:
  - `cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs`
  - Result: passed; 75 operations, 70 client contracts, 347 strict client JSON error responses.
- Cross-repo full verification:
  - `cd ../agentfeed-dev && bash scripts/test-all.sh`
  - Result: passed.

## Not done

- No server deployment was performed.
- No live remote API was exercised.
- `tests/test_contracts.py` remains intentionally oversized and should keep being split by cohesive API surface.

## Follow-ups

- [ ] Split remaining system-route contract tests into a dedicated file.
- [ ] Split request-boundary and middleware contract tests into dedicated files.
- [ ] Split auth, worklog, ingestion, profile/settings, search/explore contract surfaces in focused verified passes.
- [ ] Consider reducing CLI full-suite wall time by optimizing subprocess-heavy tests, not by further increasing timeout.
