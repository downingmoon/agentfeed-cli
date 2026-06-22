---
title: CLI Duplicate Draft Test Split 2026-06-22
aliases:
  - CLI duplicate draft split
  - Duplicate draft guard policy split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 8b48d3c
---

# CLI Duplicate Draft Test Split 2026-06-22

## Summary

CLI duplicate draft coverage를 책임별로 분리했다.

- `tests/duplicate-draft.test.ts`: duplicate draft guard basics만 유지.
- `tests/duplicate-draft-policy.test.ts`: uploadable policy changes coverage 분리.
- `tests/duplicate-draft-note.test.ts`: note handling 및 secret redaction coverage 분리.
- `tests/duplicate-draft-helpers.ts`: per-test temp git repo 및 AgentFeed config fixture 공유.

## Changed Files

- `tests/duplicate-draft.test.ts`
- `tests/duplicate-draft-helpers.ts`
- `tests/duplicate-draft-policy.test.ts`
- `tests/duplicate-draft-note.test.ts`

## Verification Evidence

- Baseline before split: `npm test -- --run tests/duplicate-draft.test.ts` → 1 file / 9 tests passed.
- Targeted split: `npm test -- --run tests/duplicate-draft.test.ts tests/duplicate-draft-policy.test.ts tests/duplicate-draft-note.test.ts` → 3 files / 9 tests passed.
- Typecheck: `npm run typecheck` passed.
- Build: `npm run build` passed.
- Full CLI suite after final edits: `npm test -- --run` → 200 files / 848 tests passed.
- Diff hygiene: `git diff --check` clean.
- No-excuse changed-file scan clean: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion scan hit, or empty catch output.
- Changed-file pure LOC audit:
  - `tests/duplicate-draft.test.ts`: 59
  - `tests/duplicate-draft-helpers.ts`: 50
  - `tests/duplicate-draft-policy.test.ts`: 124
  - `tests/duplicate-draft-note.test.ts`: 49
- LSP diagnostics gap: changed files all failed with `Transport closed`; `npm run typecheck` used as fallback evidence.

## Scope

- No new app features.
- No CLI-Frontend-Backend contract change.
- No server, infra, or CI/CD change.
- No push/deploy due to server deploy prohibition.

## Code Commit

- `8b48d3c Split CLI duplicate draft tests`

## Remaining Next Candidates

Current oversized/near-ceiling candidates after this split:

```text
242 tests/cli-collect.test.ts
236 tests/cli-publish-review-handoff.test.ts
234 tests/share.test.ts
230 tests/cli-scan.test.ts
227 tests/cli-browser-login-flow.test.ts
223 tests/cli-collect-upload-failures.test.ts
222 tests/cli-collect-config-state.test.ts
221 tests/config-keychain-storage.test.ts
214 tests/git-draft-configured-commands.test.ts
212 tests/session-collector-generic-metadata.test.ts
```
