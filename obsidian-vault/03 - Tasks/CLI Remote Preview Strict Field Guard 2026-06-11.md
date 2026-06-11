---
title: CLI Remote Preview Strict Field Guard 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - backend
  - contract
  - preview
status: done
---

# CLI Remote Preview Strict Field Guard 2026-06-11

## Context

Backend `/v1/ingest/worklogs/preview` returns `DataResponse[IngestPreviewResponse]`. The response models use `extra="forbid"`:

- `IngestPreviewResponse`
- `IngestPreviewPayload`

CLI `parseRemotePreviewResult` validated the core value types but did not reject additional root preview fields or nested preview payload fields. That left room for backend response drift to pass through the CLI preview boundary before publish/share review.

## Changed

- Added contract coverage in `tests/publish-response-contract.test.ts` for:
  - extra root preview fields such as `debug`
  - extra nested preview payload fields such as `raw_prompt`
- Updated `src/api/publish-response.ts` with explicit allowlists for remote preview response and payload fields.
- The CLI now fails closed with `AgentFeedApiError` when preview responses contain fields outside the backend schema.

## Verification

> [!success]
> Fresh verification passed after the red test reproduced the missing guard.

- Red check: `npx vitest run tests/publish-response-contract.test.ts` failed before implementation because unexpected preview fields did not throw.
- CLI: `npm test && npm run build`
- Backend counterpart: `uv run pytest tests/test_ingestion_cli_contracts.py tests/test_ingestion_payload_contracts.py tests/test_route_response_model_contracts.py -q`
- Hygiene: changed TypeScript files remain below 250 pure LOC and diff has no `any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, or silent catch additions.
- LSP caveat: TypeScript LSP diagnostics could not run because `typescript-language-server` is not installed locally; `tsc` passed through `npm run build`.

## Follow-up

- Continue CLI/API response parser audits where backend response models use `extra="forbid"`.
- Prioritize user-visible publish/share/login boundaries because contract drift there directly affects trust in the CLI workflow.
