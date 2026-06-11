---
title: Ingest Preview Frontend Ownership Decision 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - frontend
  - backend
  - contract
  - ingestion
status: done
---

# Ingest Preview Frontend Ownership Decision 2026-06-11

## Context

`POST /v1/ingest/worklogs/preview` exists in Backend and is consumed by the CLI remote preview flow. It is protected by ingestion-token auth and accepts the CLI ingest payload shape.

A previous audit candidate asked whether Frontend should also model this endpoint in its shared API layer. Current source evidence shows:

- CLI owns the call path through `previewDraftRemote()` and `parseRemotePreviewResult()`.
- Backend owns the schema through `IngestPreviewResponse` and route response-model tests.
- Frontend has no production usage of `/ingest/worklogs/preview` and should not call ingestion-token endpoints from browser UI code.

## Decision

Do not add a Frontend API client for `/ingest/worklogs/preview` now.

This is not a missing feature in Frontend; it is a CLI-only ingestion surface. Adding an unused browser API wrapper would expand the public Frontend surface and blur auth boundaries without improving the current product flow.

## Changed

- Added a Frontend source contract guard: `src/lib/ingest-preview-ownership-source-contract.test.ts`.
- Wired the guard into `scripts/run-contract-tests.mjs`.
- The guard scans production Frontend source files and fails if `/ingest/worklogs/preview` is introduced outside intentional contract/test code.

## Verification

> [!success]
> The decision is now executable: Frontend tests fail if browser production code starts calling the CLI-only ingest preview endpoint by accident.

- Frontend contract suite: `npm test` passed.
- Red sanity: initial source guard failed when it scanned its own test string; filter was corrected to production-source-only before keeping the guard.

## Follow-up

- If a future browser-side draft preview feature is required, first document the auth model and whether it should use user session auth or a separate Backend route. Do not reuse the ingestion-token CLI endpoint directly from browser production code without a new design decision.
- Continue keeping CLI-owned ingestion endpoints documented separately from Frontend user-session API clients.
