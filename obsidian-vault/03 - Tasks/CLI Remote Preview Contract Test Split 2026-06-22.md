---
title: CLI Remote Preview Contract Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI remote preview contract test split
  - CLI remote preview contract test split
---

# CLI Remote Preview Contract Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 `previewDraftRemote()` remote preview upload payload, backend warnings, and malformed preview envelope fail-closed contracts를 focused remote-preview suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `7c052e6 Split CLI remote preview contract tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-remote-preview-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / remote preview contract suite isolation

## Background

[[CLI Upload Response Safety Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 remote preview success/error envelope contract checks가 남아 있었다. 이 케이스들은 `previewDraftRemote()` and `parseRemotePreviewResult()` boundary contract에 응집돼 있어 upload publish flow tests와 분리했다.

## Changes

- `tests/cli-remote-preview-contract.test.ts` 추가.
  - remote preview가 ingest payload를 preview endpoint로 POST한다.
  - backend warnings와 preview payload를 그대로 반환한다.
  - invalid JSON, missing data envelope, unexpected envelope field를 명확한 `API_RESPONSE_INVALID`로 처리한다.
  - missing `metrics_row`, malformed warnings, malformed valid flag를 remote-preview contract mismatch로 fail-closed 처리한다.
- `tests/api-hook.test.ts`에서 remote preview block과 unused `previewDraftRemote` import를 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 53 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-remote-preview-contract.test.ts: 2 files / 53 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 140 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 914 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-remote-preview-contract.test.ts: 70 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/TODO/FIXME/eslint-disable/empty-catch additions.
```

## Follow-up

> [!todo]
> Follow-up ingest payload contract split completed in [[CLI Ingest Payload Contract Test Split 2026-06-22]]. `tests/api-hook.test.ts` still remains oversized at 837 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. Likely next groups: publish timeout/retry/duplicate ingestion handling, publish API error/friendly error handling, upload lock tests, or cached upload reuse/stale cache contracts.
