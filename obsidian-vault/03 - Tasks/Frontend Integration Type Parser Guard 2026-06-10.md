---
title: Frontend Integration Type Parser Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - enterprise-hardening
aliases:
  - Frontend integration type parser guard
---

# Frontend Integration Type Parser Guard 2026-06-10

## Context

Settings renders backend integration status rows and per-integration setup guides. The backend `type` value controls which guide is cached and shown, so the frontend must parse it as a closed backend union rather than coerce a string into `ApiIntegrationType`.

`src/lib/api.ts` still used assertion-based membership checks in both setup-guide and integration-status paths.

## Changed

- Added source contract checks in `src/lib/page-source-contract.test.ts` to forbid assertion-based integration type membership checks and `return value as ApiIntegrationType`.
- Added `parseIntegrationTypeValue` as an exhaustive parser for `github`, `claude_code`, `codex`, `cursor`, `gemini_cli`, and `tokscale`.
- Reused the parser for both `requireIntegrationGuideType` and `requireIntegrationTypeForContract`.
- Preserved fail-closed behavior for unknown integration types and setup-guide response/request mismatches.

## Verification

- Red contract confirmed: `npm run test:contracts` failed before implementation on the new integration type assertion guard.
- Green contract: `npm run test:contracts` passed.
- Typecheck: `npm run lint` passed.
- Full frontend CI: DNS-less `npm run ci` passed.
- Cross-repo OpenAPI gate: `node scripts/check-openapi-contract.mjs` passed in `agentfeed-dev`.
- UI smoke: mocked `/settings` rendered `Connect Codex CLI`, `agentfeed collect --source codex --explain`, and `Connect GitHub` setup guide rows from typed integration responses.
- LSP diagnostics were unavailable because `typescript-language-server` is not installed locally; `tsc --noEmit` covered type validation.

## Deployment

No server deployment was performed. Current goal explicitly keeps server/infra/CICD work on hold.

## Follow-ups

- [[Frontend Worklog Author View Model Assertion Cleanup]]: `_author` view-model augmentation currently uses assertions and should be replaced with an explicit composed type.
- [[Frontend Public User Stats Normalization Cleanup]]: remaining `BackendProjectStats` assertion in `api.ts` should be removed in a focused parser pass.
- [[Frontend Normalizer Record Boundary Cleanup]]: top-level `value as Record<string, unknown>` normalizer casts should be reviewed separately from domain union casts.
