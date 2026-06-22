---
title: CLI Publish Review Handoff Helper Split 2026-06-22
aliases:
  - CLI publish review handoff helper split
  - Publish review URL handoff fixture split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: a5af734
---

# CLI Publish Review Handoff Helper Split 2026-06-22

## Summary

CLI publish review URL handoff test harness를 책임별로 분리했다.

- `tests/cli-publish-review-handoff.test.ts`: publish review URL handoff policy assertions만 유지.
- `tests/cli-publish-review-handoff-helpers.ts`: cached upload binding, upload preflight server, open-review Codex session fixture, publish test server, local server lifecycle, cached upload assignment helper를 분리.
- 기존 `tests/cli-publish-json-helpers.ts`의 publish JSON fixture와 upload preflight/request body helpers를 계속 재사용했다.

## Changed Files

- `tests/cli-publish-review-handoff.test.ts`
- `tests/cli-publish-review-handoff-helpers.ts`

## Verification Evidence

- Baseline before split: `npm test -- --run tests/cli-publish-review-handoff.test.ts` → 1 file / 4 tests passed.
- Post-split target: `npm test -- --run tests/cli-publish-review-handoff.test.ts` → 1 file / 4 tests passed.
- Typecheck: `npm run typecheck` passed.
- Build: `npm run build` passed.
- Full CLI suite: `npm test -- --run` → 200 files / 848 tests passed.
- Diff hygiene: `git diff --check` clean.
- No-excuse changed-file scan clean: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion scan hit, or empty catch output.
- Changed-file pure LOC audit:
  - `tests/cli-publish-review-handoff.test.ts`: 169
  - `tests/cli-publish-review-handoff-helpers.ts`: 107
- LSP diagnostics gap: changed files all failed with `Transport closed`; `npm run typecheck` used as fallback evidence.

## Scope

- No new app features.
- No CLI-Frontend-Backend contract change.
- No server, infra, or CI/CD change.
- No push/deploy due to server deploy prohibition.

## Code Commit

- `a5af734 Split CLI publish review handoff helpers`

## Remaining Next Candidates

Current oversized/near-ceiling candidates after this split:

```text
234 tests/share.test.ts
230 tests/cli-scan.test.ts
227 tests/cli-browser-login-flow.test.ts
223 tests/cli-collect-upload-failures.test.ts
222 tests/cli-collect-config-state.test.ts
221 tests/config-keychain-storage.test.ts
214 tests/git-draft-configured-commands.test.ts
212 tests/session-collector-generic-metadata.test.ts
211 tests/cli-share-json-handoff.test.ts
210 tests/keychain-env.test.ts
205 tests/cli-collect-json-auth.test.ts
204 tests/cli-upload-confirmation.test.ts
```
