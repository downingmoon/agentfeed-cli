---
title: Frontend Metadata Strict Field Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - contract
  - metadata
status: done
---

# Frontend Metadata Strict Field Guard 2026-06-11

## Context

Backend `/v1/metadata` is returned as `DataResponse[ApiMetadataResponse]`. The nested Pydantic models use `extra="forbid"`:

- `ApiMetadataResponse`
- `SupportedClients`
- `ClientCompatibility`

The frontend compatibility guard previously checked required compatibility values but still allowed extra root metadata fields, arbitrary `supported_clients` keys, and extra fields inside client compatibility rows. That could make the app treat a drifted metadata contract as compatible.

## Changed

- Added `src/lib/metadata-strict-fields.contract.test.ts` with root, `supported_clients`, `frontend`, and `cli` extra-field cases.
- Registered the test in `scripts/run-contract-tests.mjs`.
- Updated `src/lib/api-compatibility.ts` so `isBackendCompatible` now fails closed unless metadata keys match the backend schema shape:
  - root: `service`, `api_version`, `backend_version`, `contract_version`, `review_base_url`, `supported_clients`
  - supported clients: `cli`, `frontend`
  - each client: `min_version`, `contract_version`
- Tightened the exported TypeScript metadata types to readonly exact client fields instead of an open index signature.

## Verification

> [!success]
> Fresh verification passed after the red test reproduced the missing guard.

- Red check: `npm run test:contracts` failed on `metadata compatibility must reject metadata root extra fields` before implementation.
- Frontend: `npm run lint && npm test`
- Backend counterpart: `uv run pytest tests/test_system_contracts.py tests/test_error_contracts.py tests/test_rate_limit_route_coverage_contracts.py`
- Hygiene: changed files remain below 250 pure LOC and diff has no `any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, or silent catch additions.
- LSP caveat: TypeScript LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc --noEmit` passed through `npm run lint`.

## Follow-up

- Keep auditing read-side response guards where frontend compatibility uses type guards instead of explicit response parsers.
- Consider documenting a single source-of-truth contract checklist for `/metadata`, because CLI and frontend both gate release-sensitive flows on it.
