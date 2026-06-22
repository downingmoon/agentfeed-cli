---
title: CLI Git Draft Configured Commands Test Split 2026-06-22
aliases:
  - CLI git draft configured commands test split
  - Git draft configured commands split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: ab383d15eb2d7346c17da1fc5ecd58f31a28edc7
---

# CLI Git Draft Configured Commands Test Split 2026-06-22

## Summary

CLI near-ceiling `tests/git-draft-configured-commands.test.ts`를 configured command core behavior, safety guardrails, auto inference coverage로 분리했다. 공통 temp git project setup과 config/script/package helpers는 `tests/git-draft-configured-commands-helpers.ts`로 이동했다.

> [!success]
> Behavior-preserving test split only. 신규 앱 기능, 서버/인프라/CI/CD 변경, push/deploy 없음.

## Code Commit

- `ab383d15eb2d7346c17da1fc5ecd58f31a28edc7` — `Split CLI git draft configured command tests`

## Files

- `tests/git-draft-configured-commands.test.ts`
  - configured command default-off behavior
  - explicit test command execution
  - failed configured test command metric/raw-output redaction
- `tests/git-draft-configured-command-safety.test.ts`
  - shell interpreter refusal
  - wrapper shell interpreter refusal
  - sensitive environment stripping
- `tests/git-draft-configured-command-auto.test.ts`
  - npm test auto inference
  - malformed `package.json` warnings
  - build failure metrics without test counting
  - npm build auto inference
- `tests/git-draft-configured-commands-helpers.ts`
  - temp git project fixture
  - initialized config parser/preserving writer
  - `.agentfeed` script writer
  - package.json writer
  - env snapshot/restore helpers

## Verification Evidence

- Baseline before split:
  - `npm test -- --run tests/git-draft-configured-commands.test.ts`
  - 1 file / 10 tests passed
- Targeted split:
  - `npm test -- --run tests/git-draft-configured-commands.test.ts tests/git-draft-configured-command-safety.test.ts tests/git-draft-configured-command-auto.test.ts`
  - 3 files / 10 tests passed
- Typecheck:
  - `npm run typecheck` passed
- Build:
  - `npm run build` passed
- Full CLI suite:
  - `npm test -- --run`
  - 211 files / 848 tests passed
- Whitespace:
  - `git diff --check` passed before commit
  - `git diff --staged --check` passed before commit
- Changed-file pure LOC audit:
  - `tests/git-draft-configured-commands.test.ts`: 52
  - `tests/git-draft-configured-command-safety.test.ts`: 82
  - `tests/git-draft-configured-command-auto.test.ts`: 66
  - `tests/git-draft-configured-commands-helpers.ts`: 81

## LSP Gap

LSP diagnostics were attempted for all changed TypeScript files, but the LSP transport failed with `Transport closed`. Fallback evidence is `npm run typecheck`, `npm run build`, targeted Vitest, full Vitest, and diff checks.

## Remaining 200+ LOC Candidates

Next CLI test split candidates after this commit:

```text
212 tests/session-collector-generic-metadata.test.ts
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
- [[CLI Git Draft Test Split 2026-06-22]]
- [[CLI Keychain Storage Test Split 2026-06-22]]
