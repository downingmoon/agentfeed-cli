---
title: CLI Metadata Required Field Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - backend
  - contract
  - metadata
status: done
---

# CLI Metadata Required Field Guard 2026-06-11

## Context

Backend `/v1/metadata` returns `DataResponse[ApiMetadataResponse]`. The backend schema requires all metadata root fields and requires both `supported_clients.cli` and `supported_clients.frontend` rows.

The CLI metadata parser already rejected unexpected fields, but it represented backend-required fields as optional and could parse partial metadata before `apiMetadataCompatible` rejected it later. That weakened the API boundary and produced a generic compatibility error instead of a clear malformed-metadata error.

## Changed

- Tightened `src/api/metadata.ts` so parsed `ApiMetadata` mirrors the backend required schema:
  - all root fields are required readonly strings
  - `supported_clients.cli` and `supported_clients.frontend` are required
  - each client row requires `min_version` and `contract_version`
- Added `tests/metadata-response-contract.test.ts` to assert that missing backend-required `supported_clients` fails at the metadata parser boundary.
- Updated the existing share preflight expectation to the more precise parser error: `AgentFeed API metadata response data is invalid.`

## Verification

> [!success]
> Fresh verification passed after the red test reproduced the weak parser boundary.

- Red check: `npx vitest run tests/api-hook.test.ts -t "reports malformed API compatibility metadata clearly"` failed before implementation because missing `supported_clients` returned the generic compatibility error.
- Target checks:
  - `npx vitest run tests/api-hook.test.ts -t "reports malformed API compatibility metadata clearly"`
  - `npx vitest run tests/metadata-response-contract.test.ts tests/cli-share.test.ts -t "metadata response contract|refuses share upload before ingest when API metadata is incompatible"`
- CLI full suite/build: `npm test && npm run build` → 39 files / 617 tests passed.
- Backend counterpart: `uv run pytest tests/test_system_contracts.py tests/test_error_contracts.py tests/test_rate_limit_route_coverage_contracts.py -q` → 17 passed.
- Hygiene: new/modified focused TypeScript code remains below 250 pure LOC; `tests/cli-share.test.ts` is inherited oversized and only had an expected message string updated, with no line additions.
- LSP caveat: TypeScript LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc` passed through `npm run build`.

## Follow-up

- Continue comparing CLI response parser types against backend Pydantic required fields, not only extra-field behavior.
- Consider extracting oversized CLI integration tests into focused contract files over time when touching behavior clusters.
