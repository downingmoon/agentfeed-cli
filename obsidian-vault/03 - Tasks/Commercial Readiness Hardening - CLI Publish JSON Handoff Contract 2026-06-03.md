---
title: Commercial Readiness Hardening - CLI Publish JSON Handoff Contract 2026-06-03
aliases:
  - CLI Publish JSON Handoff Contract
  - Publish JSON Side Effect Guard
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/handoff
  - agentfeed/automation
status: done
created: 2026-06-03
updated: 2026-06-03
---

# CLI Publish JSON Handoff Contract

> [!success] Outcome
> `agentfeed publish --json` now has explicit regression coverage for quiet-by-default automation behavior and machine-readable clipboard/browser handoff failure reporting.

## Risk

> [!bug] P1 automation reliability
> `publish --json` is the automation-friendly upload path. If it silently opens browsers/copies URLs by default, or hides requested clipboard/browser failures in human-only stderr text, CI and agent workflows can become flaky or unable to recover deterministically.

## Contract Locked

- `agentfeed publish --json` does **not** copy to clipboard by default.
- `agentfeed publish --json` does **not** open the browser by default.
- `agentfeed publish --json --clipboard --open-review` records both channel outcomes under `handoff`.
- Requested handoff failures remain successful uploads but are reported in JSON as:
  - `handoff.clipboard.requested=true`, `ok=false`, `warning=...`
  - `handoff.browser.requested=true`, `ok=false`, `warning=...`
- Handoff failures do not corrupt stdout JSON and do not print extra stderr noise.

## Files

- `tests/cli-share.test.ts`
  - Added publish JSON quiet-default side-effect regression.
  - Added publish JSON requested handoff failure regression.

## Verification

- `npm test -- --run tests/cli-share.test.ts` → 34 tests passed.
- 후속 전체 gate: `agentfeed-dev/scripts/test-all.sh`.

## Related

- [[Commercial Readiness Hardening - Settings Review Cookie and Command Wrapper Safety 2026-06-01]]
- [[Commercial Readiness Hardening - CLI Two Process Publish and OAuth Approval Contract 2026-06-02]]
- [[Commercial Readiness Hardening - CLI Draft Identity Guard 2026-06-03]]
- [[Active Tasks]]
