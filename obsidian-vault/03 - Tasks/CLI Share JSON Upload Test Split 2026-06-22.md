---
title: CLI Share JSON Upload Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI share JSON upload test split
  - CLI share JSON upload test split
---

# CLI Share JSON Upload Test Split 2026-06-22

> [!success]
> CLI `tests/cli-share.test.ts`에서 share JSON upload output, review URL handoff, upload-failure side-effect 계약을 별도 suites와 shared helper로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `e20e0e8 Split CLI share JSON upload tests`
- 변경 파일:
  - `tests/cli-share.test.ts`
  - `tests/cli-share-json-upload-helpers.ts`
  - `tests/cli-share-json-upload-output.test.ts`
  - `tests/cli-share-json-handoff.test.ts`
  - `tests/cli-share-json-upload-failure.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / share JSON upload-output and side-effect isolation

## Background

`tests/cli-share.test.ts`는 upload preflight failure split 이후에도 1404 pure LOC였고, share JSON upload smoke output, cursor persistence, reused-draft redaction, review URL handoff side effects, upload failure side-effect suppression contracts가 remaining publish JSON/locking/human warning coverage와 섞여 있었다. JSON share upload 경계를 먼저 분리해 `cli-share.test.ts`를 928 pure LOC로 낮췄다.

## Changes

- `tests/cli-share-json-upload-helpers.ts`를 추가해 isolated CLI fixture, upload-preflight test responses, request-body parser, fake clipboard/browser/failing handoff commands, Codex session fixture를 공유한다.
- `tests/cli-share-json-upload-output.test.ts`를 추가해 uploaded JSON output smoke, `--no-save-cursor`, reused draft secret redaction before JSON output/upload contracts를 분리했다.
- `tests/cli-share-json-handoff.test.ts`를 추가해 share JSON default no-side-effect, explicit clipboard/open-review side effect, requested handoff failure JSON reporting contracts를 분리했다.
- `tests/cli-share-json-upload-failure.test.ts`를 추가해 share JSON upload failure가 review URL copy/open and cursor persistence side effects를 발생시키지 않는 계약을 분리했다.
- `tests/cli-share.test.ts`에서 해당 7개 cases를 제거하고 human upload confirmation, publish JSON, publish locking, human handoff warning coverage를 유지했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/cli-share.test.ts: 1 file / 21 tests passed
Targeted split: npm test -- --run tests/cli-share-json-upload-output.test.ts tests/cli-share-json-handoff.test.ts tests/cli-share-json-upload-failure.test.ts tests/cli-share.test.ts: 4 files / 21 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 126 files / 848 tests passed
Git whitespace: git diff --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share.test.ts: 928 pure LOC
tests/cli-share-json-upload-helpers.ts: 147 pure LOC
tests/cli-share-json-upload-output.test.ts: 245 pure LOC
tests/cli-share-json-handoff.test.ts: 211 pure LOC
tests/cli-share-json-upload-failure.test.ts: 69 pure LOC
```

## Follow-up

> [!todo]
> `tests/cli-share.test.ts` remains oversized at 928 pure LOC. Continue behavior-preserving splits by cohesive groups: publish JSON handoff/output, publish locking, human handoff warnings, and human upload completion/confirmation gates. Keep targeted verification plus full CLI suite before each commit.
