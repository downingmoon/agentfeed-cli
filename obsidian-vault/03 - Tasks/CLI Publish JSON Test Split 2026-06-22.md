---
title: CLI Publish JSON Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI publish JSON test split
  - CLI publish JSON test split
---

# CLI Publish JSON Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 direct publish JSON output and review URL handoff 계약을 별도 suites와 shared helper로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `fcc1753 Split CLI publish JSON tests`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-publish-json-helpers.ts`
  - `tests/cli-publish-json-output.test.ts`
  - `tests/cli-publish-json-handoff.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / publish JSON output and handoff isolation

## Background

`tests/cli-share.test.ts`는 share JSON upload split 이후에도 oversized 상태였고, direct `agentfeed publish --json` output, default no-side-effect behavior, requested review URL handoff failure reporting contracts가 publish locking and human handoff coverage와 섞여 있었다. Machine-readable publish 경계를 먼저 분리해 remaining split 후보를 더 작게 만들었다.

## Changes

- `tests/cli-publish-json-helpers.ts`를 추가해 isolated CLI fixture, compatible metadata/token preflight handlers, upload request-body parser, fake clipboard/browser/failing handoff commands를 공유한다.
- `tests/cli-publish-json-output.test.ts`를 추가해 `agentfeed publish --json --clipboard` machine-readable upload output and explicit clipboard side effect contract를 분리했다.
- `tests/cli-publish-json-handoff.test.ts`를 추가해 publish JSON default no-copy/no-open behavior와 requested clipboard/browser handoff failure JSON reporting contracts를 분리했다.
- `tests/cli-share.test.ts`에서 해당 3개 cases를 제거하고 publish locking, human handoff warning, human upload completion/confirmation coverage를 유지했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/cli-share.test.ts: 1 file / 14 tests passed
Targeted split: npm test -- --run tests/cli-publish-json-output.test.ts tests/cli-publish-json-handoff.test.ts tests/cli-share.test.ts: 3 files / 14 tests passed
Sequential targeted rerun: npm test -- --run --no-file-parallelism tests/cli-publish-json-output.test.ts tests/cli-publish-json-handoff.test.ts tests/cli-share.test.ts: 3 files / 14 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 128 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 733 pure LOC
tests/cli-publish-json-helpers.ts: 142 pure LOC
tests/cli-publish-json-output.test.ts: 74 pure LOC
tests/cli-publish-json-handoff.test.ts: 151 pure LOC
```

## Verification Note

> [!info]
> An initial validation attempt ran `npm run build` and targeted tests in parallel from the same working tree, which caused a transient `dist/` import/export race. The same test set passed when rerun sequentially, and the full CLI suite passed afterward.

## Follow-up

> [!todo]
> `tests/cli-share.test.ts` remains oversized at 733 pure LOC. Continue behavior-preserving splits by cohesive groups: publish locking, human handoff warnings, and human upload completion/confirmation gates. Keep targeted verification plus full CLI suite before each commit.
