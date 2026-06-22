---
title: CLI Visibility Source Contract Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI visibility source contract test split
  - CLI visibility source contract test split
---

# CLI Visibility Source Contract Test Split 2026-06-22

> [!success]
> CLI `tests/api-hook.test.ts`에 남아 있던 source-level visibility/private-review upload status guard를 focused visibility-source suite로 분리했다. `tests/api-hook.test.ts`를 249 pure LOC로 낮춰 250 pure LOC ceiling 아래로 복귀시켰고, CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `ad7b8da Split CLI visibility source contract test`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-visibility-source-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / visibility source guard isolation

## Background

[[CLI Upload Timeout Reconciliation Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`는 263 pure LOC로 250 pure LOC ceiling을 초과했다. 남은 top-level visibility source guard는 temp project fixture를 쓰는 publish API tests와 독립적이어서 가장 작은 behavior-preserving split 후보였다.

## Changes

- `tests/cli-visibility-source-contract.test.ts` 추가.
  - CLI public `Visibility` union이 `private | unlisted | public`이고 신규 `team` visibility를 포함하지 않는지 확인한다.
  - publish private-review surface가 `PublishDraftVisibility = 'private'`, remote `needs_review`, cached `already_uploaded`, strict response field set을 유지하는지 확인한다.
  - CLI upload client가 generic `Visibility, WorklogStatus` surface로 되돌아가지 않는지 source contract로 막는다.
- `tests/api-hook.test.ts`에서 해당 top-level source guard를 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 15 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-visibility-source-contract.test.ts: 2 files / 15 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 146 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 249 pure LOC after split; under 250 ceiling, still in warning band.
tests/cli-visibility-source-contract.test.ts: 17 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` is now under the hard 250 pure LOC ceiling but remains in the 200-250 warning band. Avoid adding new cases to it; if more API publish contract coverage is needed, continue splitting by cohesive groups such as publish API friendly errors, split review frontend host trust, re-scan redaction, or basic publish/concurrency.
