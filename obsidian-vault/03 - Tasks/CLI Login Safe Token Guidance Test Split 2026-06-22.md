---
title: CLI Login Safe Token Guidance Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI login safe token guidance test split
  - CLI login safe token guidance test split
---

# CLI Login Safe Token Guidance Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 login safe-token guidance coverage를 focused suite로 분리했다. `login --json` browser-auth refusal, help output의 safe token input guidance, literal argv token rejection 계약을 production/runtime 동작 변경 없이 보존했고 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `831e4b5 Split CLI login safe token guidance tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-login-safe-token-guidance.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / login safe-token guidance suite isolation

## Background

[[CLI Login CI Fail Fast Test Split 2026-06-22]] follow-up에 남아 있던 browser login JSON refusal 후보는 literal argv token help/rejection coverage와 함께 safe-token input guidance boundary에 속했다. 이번 pass는 safe-token guidance 3개 tests를 분리해 oversized status/doctor suite를 더 줄였다.

## Changes

- `tests/cli-login-safe-token-guidance.test.ts` 추가.
  - `agentfeed login --json --no-open`이 browser auth를 거부하고 stdout parseability와 safe token next actions를 유지하는 계약을 보존했다.
  - CLI help가 `--token-stdin`/`--token - --no-save`를 안내하고 literal `--token <token>` 예시를 노출하지 않는 계약을 보존했다.
  - literal argv token login이 기본적으로 거부되고 secret을 stderr/stdout에 누출하지 않는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 safe-token guidance test cases를 제거했다.
- 신규 suite의 CLI process failure 및 JSON output parsing은 `unknown` boundary helpers로 처리했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "login --json refuses browser auth|does not advertise literal argv token|rejects literal argv token": 1 file / 3 tests passed / 24 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-login-safe-token-guidance.test.ts -t "login --json refuses browser auth|does not advertise literal argv token|rejects literal argv token": 1 file passed / 1 skipped, 3 tests passed / 24 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-login-safe-token-guidance.test.ts: 2 files / 27 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 154 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new login safe-token guidance suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 998 pure LOC after split; still oversized, but now below 1000 pure LOC.
tests/cli-login-safe-token-guidance.test.ts: 126 pure LOC; focused login safe-token guidance suite.
```

## Follow-up

> [!success]
> Follow-up rotate replacement/failure cases completed in [[CLI Rotate Auth Flow Test Split 2026-06-22]]. `tests/cli-status-doctor.test.ts` is now 722 pure LOC after the rotate split.

> [!todo]
> Continue only by cohesive behavior clusters such as browser login no-save output, status project/readiness diagnostics, status cursor/config diagnostics, or doctor JSON/provenance diagnostics, and preserve baseline coverage before each split.
