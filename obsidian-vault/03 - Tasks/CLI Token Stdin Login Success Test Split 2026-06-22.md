---
title: CLI Token Stdin Login Success Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI token stdin login success test split
  - CLI token stdin login success test split
---

# CLI Token Stdin Login Success Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 token-stdin login success output coverage를 focused suite로 분리했다. stdin secret 전달, human output secret non-leak, JSON output parseability/secret non-leak, file credential persistence 계약을 production/runtime 동작 변경 없이 보존했고 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `9021a8f Split CLI token stdin login success tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-login-token-stdin-success.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / token-stdin login success suite isolation

## Background

[[CLI Logout Credential Cleanup Test Split 2026-06-22]] follow-up에 남아 있던 cohesive split 후보 중 login token-stdin success coverage는 browser login, logout, doctor diagnostics와 독립적인 CLI login input/output contract였다. 이번 pass는 token-stdin success 2개 tests만 분리해 oversized status/doctor suite를 더 줄였다.

## Changes

- `tests/cli-login-token-stdin-success.test.ts` 추가.
  - `agentfeed login --token-stdin`이 token을 argv나 stdout/stderr에 노출하지 않고 stdin으로 읽는 계약을 보존했다.
  - `agentfeed login --token-stdin --json`이 machine-readable JSON output을 유지하고 secret을 stdout/stderr에 누출하지 않는 계약을 보존했다.
  - file credential store persistence assertion을 새 suite에 유지했다.
- `tests/cli-status-doctor.test.ts`에서 token-stdin success test cases를 제거했다.
- 신규 suite 생성 중 미사용 `mkdir`/`writeFile` import를 제거하고, JSON parse result의 불필요한 local type assertion을 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "login reads a token from stdin|login prints machine-readable token-stdin": 1 file / 2 tests passed / 32 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-login-token-stdin-success.test.ts -t "login reads a token from stdin|login prints machine-readable token-stdin": 2 tests passed / 32 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-login-token-stdin-success.test.ts: 2 files / 34 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 151 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new token-stdin success suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 1269 pure LOC after split; still oversized, but reduced by another isolated contract cluster.
tests/cli-login-token-stdin-success.test.ts: 182 pure LOC; focused token-stdin login success suite.
```

## Follow-up

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 1269 pure LOC. Continue only by cohesive behavior clusters such as token-stdin failure cases, browser login JSON refusal, CI login fail-fast, rotate replacement, or status project/readiness diagnostics, and preserve baseline coverage before each split.
