---
title: CLI Ingest Payload Contract Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI ingest payload contract test split
  - CLI ingest payload contract test split
---

# CLI Ingest Payload Contract Test Split 2026-06-22

> [!success]
> CLI oversized `tests/api-hook.test.ts`에서 `draftToIngestRequest()` source identity privacy, repository URL sanitation, collected model serialization, metadata redaction, and share note mapping contracts를 focused ingest-payload suite로 분리했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `2524aed Split CLI ingest payload contract tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-ingest-payload-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / ingest payload serialization and privacy suite isolation

## Background

[[CLI Remote Preview Contract Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 upload/publish orchestration tests와 직접 관계 없는 `draftToIngestRequest()` payload serialization/privacy checks가 남아 있었다. 이 케이스들은 파일 IO와 remote upload 없이 순수 draft-to-ingest boundary contract만 검증하므로 focused suite로 분리했다.

## Changes

- `tests/cli-ingest-payload-contract.test.ts` 추가.
  - collection window, collection fingerprint, anonymized session/local draft identity 보존/익명화 계약을 검증한다.
  - HTTP repository URL credential stripping과 non-HTTP remote omission을 검증한다.
  - collected model, `models_used`, and per-agent model metrics serialization을 검증한다.
  - summary fields 밖 string metadata secret redaction을 검증한다.
  - share notes가 generated summary에 섞이지 않고 `user_note`로 전송되는 계약을 검증한다.
- `tests/api-hook.test.ts`에서 해당 payload-only block과 unused `draftToIngestRequest` import를 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 46 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-ingest-payload-contract.test.ts: 2 files / 46 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 141 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 837 pure LOC after split; still oversized and still has inherited pre-existing escape hatches.
tests/cli-ingest-payload-contract.test.ts: 83 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits.
```

## Follow-up

> [!todo]
> Follow-up ingest upload retry split completed in [[CLI Ingest Upload Retry Test Split 2026-06-22]]. `tests/api-hook.test.ts` still remains oversized at 714 pure LOC. Continue only cohesive, behavior-preserving splits with green coverage. Likely next groups: upload lock tests, cached upload reuse/stale cache contracts, upload review frontend host trust tests, timeout reconciliation tests, or publish API friendly error handling.
