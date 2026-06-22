---
title: CLI Token Stdin Failure Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI token stdin failure test split
  - CLI token stdin failure test split
---

# CLI Token Stdin Failure Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 token-stdin failure output coverage를 focused suite로 분리했다. incompatible API metadata, invalid/revoked ingestion token, empty stdin remediation 계약을 production/runtime 동작 변경 없이 보존했고 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `b491a4c Split CLI token stdin failure tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-login-token-stdin-failures.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / token-stdin failure suite isolation

## Background

[[CLI Token Stdin Login Success Test Split 2026-06-22]] follow-up에 남아 있던 cohesive split 후보 중 token-stdin failure coverage는 login success output, browser login, CI login fail-fast와 독립적인 CLI safe-token input failure contract였다. 이번 pass는 token-stdin failure 3개 tests만 분리해 oversized status/doctor suite를 더 줄였다.

## Changes

- `tests/cli-login-token-stdin-failures.test.ts` 추가.
  - incompatible `/v1/metadata` 응답이면 credentials 저장 전에 실패하고 token을 stderr/stdout에 누출하지 않는 계약을 보존했다.
  - `/v1/ingest/status` 401 invalid/revoked token이면 credentials 저장 전에 실패하고 token을 stderr/stdout에 누출하지 않는 계약을 보존했다.
  - empty stdin이면 copyable safe-token guidance를 출력하고 credentials file을 쓰지 않는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 token-stdin failure test cases와 더 이상 필요 없는 `execFileWithInput` helper를 제거했다.
- 신규 suite의 CLI process failure narrowing은 `unknown` boundary helper로 처리했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "refuses token-stdin|rejects empty token stdin": 1 file / 3 tests passed / 29 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-login-token-stdin-failures.test.ts -t "refuses token-stdin|rejects empty token stdin": 1 file passed / 1 skipped, 3 tests passed / 29 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-login-token-stdin-failures.test.ts: 2 files / 32 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 152 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new token-stdin failure suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 1142 pure LOC after split; still oversized, but reduced by another isolated contract cluster.
tests/cli-login-token-stdin-failures.test.ts: 183 pure LOC; focused token-stdin failure suite.
```

## Follow-up

> [!success]
> CI login fail-fast coverage was split in [[CLI Login CI Fail Fast Test Split 2026-06-22]], reducing `tests/cli-status-doctor.test.ts` from 1142 to 1063 pure LOC.

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 1063 pure LOC. Continue only by cohesive behavior clusters such as browser login JSON refusal, rotate replacement/failure cases, or status project/readiness diagnostics, and preserve baseline coverage before each split.
