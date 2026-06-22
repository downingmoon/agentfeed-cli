---
title: CLI Browser Login No Save Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI browser login no-save test split
  - CLI browser login no-save test split
---

# CLI Browser Login No Save Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 browser-login `--no-open --no-save` UX and secret non-leak coverage를 focused suite로 분리했다. Browser authorization copy, no-save summary, safe next actions, credential-file non-write, and token non-leak 계약을 production/runtime 동작 변경 없이 보존했고 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `d98560d Split CLI browser login no-save tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-browser-login-no-save-output.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / browser login no-save output suite isolation

## Background

[[CLI Rotate Auth Flow Test Split 2026-06-22]] follow-up에 남아 있던 browser login no-save output case가 다음 독립 behavior cluster였다. 이번 pass는 `agentfeed login --no-open --no-save`가 브라우저 승인 UX와 no-save 결과를 안전하게 출력하는 단일 E2E 계약을 purpose-named suite로 이동했다.

## Changes

- `tests/cli-browser-login-no-save-output.test.ts` 추가.
  - `agentfeed login --no-open --no-save --api-base-url <local>`가 browser authorization, approval code, waiting guidance, not-saved summary, next actions를 출력하는 계약을 보존했다.
  - Exchange token이 ingestion status check에만 쓰이고 stdout/stderr 및 saved credentials file에 남지 않는 secret non-leak 계약을 보존했다.
  - No-save flow가 credentials file을 생성하지 않는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 browser login no-save output test case를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "login no-open no-save prints safe browser-login status text without credentials": 1 file / 1 test passed / 19 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-browser-login-no-save-output.test.ts -t "login no-open no-save prints safe browser-login status text without credentials": 1 file passed / 1 skipped, 1 test passed / 19 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-browser-login-no-save-output.test.ts: 2 files / 20 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 158 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new browser login no-save suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 623 pure LOC after split; still oversized.
tests/cli-browser-login-no-save-output.test.ts: 124 pure LOC.
```

## Follow-up

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 623 pure LOC. Continue only by cohesive behavior clusters such as status project/readiness diagnostics, status cursor/config diagnostics, package/version diagnostics, or doctor JSON/provenance diagnostics. Preserve baseline coverage before each split.
