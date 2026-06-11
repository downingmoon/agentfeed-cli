---
title: CLI API Data Envelope Boundary 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - contracts
  - enterprise-quality
status: done
related:
  - "[[Frontend API Facade Split 2026-06-11]]"
---

# CLI API Data Envelope Boundary 2026-06-11

## Summary

The CLI shared API `DataResponse` envelope helper now returns `unknown` instead of a generic `T` backed by `value.data as T`. Upload, preview, and browser-login callers continue to parse the returned payload through endpoint-specific parsers.

## Why

Backend responses are untrusted at the HTTP boundary. The CLI must not convert `data` into trusted types through a generic assertion; endpoint modules should parse the payload shape before credentials, draft upload state, or review URLs are accepted.

## Changed

- Updated `src/api/response-contract.ts`.
- Updated `src/api/client.ts` call sites to consume `unknown` from `responseDataEnvelope`.
- Added `tests/api-response-contract.test.ts` to prevent reintroducing the generic cast at the API boundary.

## Verification

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run typecheck
npm test -- --run
npm run build
```

Evidence:

- `npm run typecheck` passed.
- `npm test -- --run` passed: 36 files, 611 tests.
- `npm run build` passed.
- Changed files remain under 250 pure LOC:
  - `src/api/response-contract.ts`: 84
  - `src/api/client.ts`: 164
  - `tests/api-response-contract.test.ts`: 17
- Server deployment was intentionally skipped.

## Commit

- CLI: `5931f45 Tighten CLI API data envelope boundary`

## Remaining follow-up

> [!todo]
> Continue CLI-API-Frontend contract sweep for ingest payload schema drift, especially multi-agent metrics and review URL trust assumptions.

> [!warning]
> Server, infra, and CI/CD remain intentionally out of scope for the current enterprise-quality local/code hardening goal.
