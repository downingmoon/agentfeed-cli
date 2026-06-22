---
title: CLI Login CI Fail Fast Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI login CI fail fast test split
  - CLI login CI fail fast test split
---

# CLI Login CI Fail Fast Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 login CI fail-fast coverage를 focused suite로 분리했다. CI 환경에서 browser session request 없이 즉시 실패하는 remediation output과 existing `AGENTFEED_TOKEN` guidance 계약을 production/runtime 동작 변경 없이 보존했고 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `f0856ef Split CLI login CI fail fast tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-login-ci-fail-fast.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / login CI fail-fast suite isolation

## Background

[[CLI Token Stdin Failure Test Split 2026-06-22]] follow-up에 남아 있던 cohesive split 후보 중 CI login fail-fast coverage는 token input validation, browser login success, and rotate CI behavior와 독립적인 login command CI safety contract였다. 이번 pass는 login CI fail-fast 2개 tests만 분리해 oversized status/doctor suite를 더 줄였다.

## Changes

- `tests/cli-login-ci-fail-fast.test.ts` 추가.
  - `agentfeed login --no-open`이 CI에서 browser session request 없이 빠르게 실패하고 token remediation을 출력하는 계약을 보존했다.
  - CI에서 `AGENTFEED_TOKEN`이 이미 존재할 때 non-login command guidance를 출력하는 계약을 보존했다.
  - credentials file이 쓰이지 않는 fail-closed assertion을 유지했다.
- `tests/cli-status-doctor.test.ts`에서 login CI fail-fast test cases를 제거했다.
- 신규 suite의 CLI process failure narrowing은 `unknown` boundary helper로 처리했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "login fails fast in CI": 1 file / 2 tests passed / 27 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-login-ci-fail-fast.test.ts -t "login fails fast in CI": 1 file passed / 1 skipped, 2 tests passed / 27 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-login-ci-fail-fast.test.ts: 2 files / 29 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 153 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new login CI fail-fast suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 1063 pure LOC after split; still oversized, but reduced by another isolated contract cluster.
tests/cli-login-ci-fail-fast.test.ts: 122 pure LOC; focused login CI fail-fast suite.
```

## Follow-up

> [!success]
> login safe-token guidance coverage was split in [[CLI Login Safe Token Guidance Test Split 2026-06-22]], reducing `tests/cli-status-doctor.test.ts` from 1063 to 998 pure LOC.

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 998 pure LOC. Continue only by cohesive behavior clusters such as rotate replacement/failure cases, browser login no-save output, status project/readiness diagnostics, or doctor JSON/provenance diagnostics, and preserve baseline coverage before each split.
