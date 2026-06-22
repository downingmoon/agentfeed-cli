---
title: CLI Split Review Host Contract Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI split review host contract test split
  - CLI split review host contract test split
---

# CLI Split Review Host Contract Test Split 2026-06-22

> [!success]
> CLI `tests/api-hook.test.ts`에 남아 있던 split review frontend host trust contract를 focused suite로 분리했다. `AGENTFEED_REVIEW_BASE_URL` 환경 복구 책임도 새 suite로 이동했고, CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `b90e4cb Split CLI split review host contract tests`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-split-review-host-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / split review frontend host trust suite isolation

## Background

[[CLI Publish Redaction Rescan Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`에는 split frontend review host acceptance coverage가 남아 있었다. 이 coverage는 generic API hook/upload contracts와 독립적인 trusted review URL host contract라서 별도 suite로 분리하기 적합했다.

## Changes

- `tests/cli-split-review-host-contract.test.ts` 추가.
  - `AGENTFEED_REVIEW_BASE_URL`로 명시 설정된 split review frontend host의 upload review URL을 허용하는 계약을 보존했다.
  - `publishDraft({ reviewBaseUrl })` metadata-provided split review frontend host를 허용하고 persisted upload metadata에 `review_base_url`을 남기는 계약을 보존했다.
- `AGENTFEED_REVIEW_BASE_URL` env restore setup/teardown 책임을 새 focused suite로 이동했다.
- `tests/api-hook.test.ts`에서 해당 두 test case를 제거해 generic API hook suite를 더 작게 유지했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 13 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-split-review-host-contract.test.ts: 2 files / 13 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 148 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in changed tests.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 170 pure LOC after split; healthy under the 200 warning band.
tests/cli-split-review-host-contract.test.ts: 78 pure LOC; focused host-contract suite.
```

## Follow-up

> [!success]
> `tests/api-hook.test.ts` is now 170 pure LOC, below the 200 warning band and 250 ceiling. Continue adding future API publish contract coverage to purpose-named suites instead of growing this catch-all file again.
