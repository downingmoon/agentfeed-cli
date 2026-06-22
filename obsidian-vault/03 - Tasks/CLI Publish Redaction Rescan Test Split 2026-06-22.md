---
title: CLI Publish Redaction Rescan Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/privacy
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI publish redaction rescan test split
  - CLI publish redaction rescan test split
---

# CLI Publish Redaction Rescan Test Split 2026-06-22

> [!success]
> CLI `tests/api-hook.test.ts`에 남아 있던 manually edited draft public field re-scan and persisted redaction contract를 focused publish-redaction suite로 분리했다. 기존 `Record<string, any>` payload assertion도 `unknown`-narrowing helper로 정리했고, CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `964f93f Split CLI publish redaction rescan test`
- 변경 파일:
  - `tests/api-hook.test.ts`
  - `tests/cli-publish-redaction-rescan-contract.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / publish privacy redaction re-scan suite isolation

## Background

[[CLI Visibility Source Contract Test Split 2026-06-22]] 이후 `tests/api-hook.test.ts`는 hard LOC ceiling 아래였지만 still warning band였다. 남은 manually edited draft re-scan test는 upload response/error/status contracts와 독립적인 privacy boundary contract였고, 기존 test body에 `Record<string, any>` escape hatch가 있어 별도 suite로 옮기며 assertion boundary를 정리했다.

## Changes

- `tests/cli-publish-redaction-rescan-contract.test.ts` 추가.
  - publish 직전 manually edited `worklog.summary`, `worklog.public_prompt`, `project.repository_url`을 재스캔/재마스킹한다.
  - backend ingest payload에는 redacted public fields와 privacy scan status/findings를 보내되 `sample_redacted` detail은 제외한다.
  - local draft에는 redacted fields와 `sample_redacted` finding detail을 보존한다.
- JSON payload assertions를 `unknown` + `recordField()`/`arrayField()`/`hasOwnField()` helper로 좁혀 `any` escape hatch 없이 검증하도록 정리했다.
- `tests/api-hook.test.ts`에서 redaction re-scan block을 제거했다.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/api-hook.test.ts: 1 file / 14 tests passed
Targeted split: npm test -- --run tests/api-hook.test.ts tests/cli-publish-redaction-rescan-contract.test.ts: 2 files / 14 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 147 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/api-hook.test.ts: 223 pure LOC after split; under 250 ceiling, still in warning band.
tests/cli-publish-redaction-rescan-contract.test.ts: 69 pure LOC; no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits.
```

## Follow-up

> [!todo]
> `tests/api-hook.test.ts` remains in the 200-250 warning band at 223 pure LOC. Avoid adding new cases to it; if more API publish contract coverage is needed, continue splitting by cohesive groups such as publish API friendly errors, split review frontend host trust, private-review response rejection/status contracts, or basic publish/concurrency.
