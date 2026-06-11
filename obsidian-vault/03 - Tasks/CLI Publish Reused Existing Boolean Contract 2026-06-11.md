---
title: CLI Publish Reused Existing Boolean Contract 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - backend
  - contract
  - publish
status: done
---

# CLI Publish Reused Existing Boolean Contract 2026-06-11

## Context

Backend ingest responses define `reused_existing` as a boolean field on the upload response. The CLI parser allowed the field name, but it treated only `true` as meaningful and silently collapsed `false` or malformed non-boolean values to `undefined`.

That was a weak API boundary: `false` is valid backend data and should be preserved, while strings such as `"false"` should fail as malformed API data instead of becoming an implicit fallback.

## Changed

- Tightened `src/api/publish-response.ts` so `reused_existing`, when present, must be a boolean.
- Preserved `reused_existing: false` in the parsed `PublishDraftResult` instead of dropping it.
- Added a focused regression in `tests/publish-response-contract.test.ts` covering both the valid false case and invalid string case.

## Verification

> [!success]
> Red/green and full CLI verification passed. No server deployment was performed.

- Red check: `npx vitest run tests/publish-response-contract.test.ts -t "preserves backend reused_existing false"` failed before implementation because the parser returned `undefined` for backend `false`.
- Targeted CLI checks:
  - `npx vitest run tests/publish-response-contract.test.ts -t "preserves backend reused_existing false|keeps ingest review URL"`
  - `npx vitest run tests/publish-response-contract.test.ts tests/api-hook.test.ts -t "preserves backend reused_existing false|publish reuses an already uploaded draft|rejects remote ingest upload statuses"`
- Backend counterpart: `uv run pytest tests/test_ingestion_cli_contracts.py tests/test_route_response_model_contracts.py -q` → 10 passed.
- CLI full suite/build: `npm test && npm run build` → 39 files / 618 tests passed, `tsc` passed.
- Hygiene: `git diff --check` passed; changed files are under 250 pure LOC (`src/api/publish-response.ts` 119, `tests/publish-response-contract.test.ts` 64).
- LSP caveat: TypeScript LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc` passed through `npm run build`.

## Follow-up

- Frontend/Backend contract parity candidate: Backend exposes CLI auth `exchange`, while frontend API-layer coverage appears to model `session` and `approve` but not exchange. Confirm this is needed for the current frontend surface before changing, because the goal prohibits adding unrelated new features.
- CLI parser follow-up candidate: review whether CLI auth `rotated_from` and `rotated_at` should be treated as an atomic pair or remain independently nullable according to backend schema and audit requirements.
- Continue preferring focused contract tests over adding cases to oversized integration files.
