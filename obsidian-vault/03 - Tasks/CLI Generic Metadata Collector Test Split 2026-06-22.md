---
title: CLI Generic Metadata Collector Test Split 2026-06-22
aliases:
  - CLI generic metadata collector test split
  - Session collector generic metadata split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 2b795f042751297bc420ecad780fb24194994295
---

# CLI Generic Metadata Collector Test Split 2026-06-22

## Summary

CLI near-ceiling `tests/session-collector-generic-metadata.test.ts`를 generic metadata core/cost/window coverage와 Cursor/path coverage로 분리했다. Shared temp git fixture, AgentFeed init commit helper, JSONL writer는 `tests/session-collector-generic-metadata-helpers.ts`로 이동했다.

> [!success]
> Behavior-preserving test split only. 신규 앱 기능, 서버/인프라/CI/CD 변경, push/deploy 없음.

## Code Commit

- `2b795f042751297bc420ecad780fb24194994295` — `Split CLI generic metadata collector tests`

## Files

- `tests/session-collector-generic-metadata.test.ts`
  - unknown generic plugin fallback collection
  - timestamp-less row filtering by since/until windows
  - timestamp aliases and numeric epoch handling
  - explicit cost collection and draft visibility policy
- `tests/session-collector-generic-metadata-cursor.test.ts`
  - explicit Cursor metadata parsing
  - malformed file URI path tolerance
  - project-local Cursor auto-collection without counting metadata files as code changes
- `tests/session-collector-generic-metadata-helpers.ts`
  - temp git project fixture
  - committed AgentFeed project initialization helper
  - JSONL writer

## Verification Evidence

- Baseline before split:
  - `npm test -- --run tests/session-collector-generic-metadata.test.ts`
  - 1 file / 10 tests passed
- Targeted split:
  - `npm test -- --run tests/session-collector-generic-metadata.test.ts tests/session-collector-generic-metadata-cursor.test.ts`
  - 2 files / 10 tests passed
- Typecheck:
  - `npm run typecheck` passed
- Build:
  - `npm run build` passed
- Full CLI suite:
  - `npm test -- --run`
  - 212 files / 848 tests passed
- Whitespace:
  - `git diff --check` passed before commit
  - `git diff --staged --check` passed before commit
- Changed-file pure LOC audit:
  - `tests/session-collector-generic-metadata.test.ts`: 121
  - `tests/session-collector-generic-metadata-cursor.test.ts`: 82
  - `tests/session-collector-generic-metadata-helpers.ts`: 38

## LSP Gap

LSP diagnostics were attempted for all changed TypeScript files, but the LSP transport failed with `Transport closed`. Fallback evidence is `npm run typecheck`, `npm run build`, targeted Vitest, full Vitest, and diff checks.

## Remaining 200+ LOC Candidates

Next CLI test split candidates after this commit:

```text
211 tests/cli-share-json-handoff.test.ts
210 tests/keychain-env.test.ts
205 tests/cli-collect-json-auth.test.ts
204 tests/cli-upload-confirmation.test.ts
204 tests/cli-api-health-checks.test.ts
203 tests/share-upload-execution.test.ts
203 tests/cli-cached-upload-reuse-contract.test.ts
202 tests/cli-status-doctor.test.ts
202 tests/cli-rotate-browser-replacement.test.ts
201 tests/cli-collect-command-ux.test.ts
200 tests/release-preflight.test.ts
```

## Related

- [[Active Tasks]]
- [[CLI Git Draft Configured Commands Test Split 2026-06-22]]
- [[CLI Keychain Storage Test Split 2026-06-22]]
