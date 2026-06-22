---
title: CLI Status Readiness Guidance Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI status readiness guidance test split
  - CLI status readiness guidance test split
---

# CLI Status Readiness Guidance Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 status readiness/account/API guidance coverage를 focused suite로 분리했다. Remote-http API remediation, setup ordering, dry-run discoverability, unsafe repo `.env` API ignore, saved-token expiry redaction 계약을 production/runtime 동작 변경 없이 보존했고 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `bda540d Split CLI status readiness guidance tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-status-readiness-guidance.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / status readiness guidance suite isolation

## Background

[[CLI Browser Login No Save Test Split 2026-06-22]] follow-up에 남아 있던 status project/readiness diagnostics cluster를 처리했다. 이번 pass는 `agentfeed status`의 setup/account/API readiness guidance와 secret-redaction behavior를 purpose-named suite로 이동했다.

## Changes

- `tests/cli-status-readiness-guidance.test.ts` 추가.
  - Remote HTTP `AGENTFEED_API_BASE_URL`에서 invalid API remediation과 login 안내 억제 계약을 보존했다.
  - 초기 setup 상태에서 `git init && agentfeed init`이 `agentfeed login`보다 먼저 안내되는 ordering 계약을 보존했다.
  - initialized project에서 login만 missing일 때 `agentfeed share --dry` discoverability를 보존했다.
  - repo `.env`의 non-local API URL이 기본적으로 ignored warning으로 처리되는 계약을 보존했다.
  - saved browser-login token expiry가 출력되되 token secret은 출력되지 않는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 status readiness guidance test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "status reports remediation|status recommends project|status keeps local dry-run|status warns when a repo|status reports saved browser-login": 1 file / 5 tests passed / 14 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-status-readiness-guidance.test.ts -t "status reports remediation|status recommends project|status keeps local dry-run|status warns when a repo|status reports saved browser-login": 1 file passed / 1 skipped, 5 tests passed / 14 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-status-readiness-guidance.test.ts: 2 files / 19 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 159 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new status readiness suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 510 pure LOC after split; still oversized.
tests/cli-status-readiness-guidance.test.ts: 138 pure LOC.
```

## Follow-up

> [!success]
> Status cursor/config diagnostics follow-up was completed by [[CLI Status Local State Diagnostics Test Split 2026-06-22]]. `tests/cli-status-doctor.test.ts` is now 452 pure LOC.

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 452 pure LOC. Continue only by cohesive behavior clusters such as package/version diagnostics, doctor setup/action ordering, doctor API remediation, or doctor JSON/provenance diagnostics. Preserve baseline coverage before each split.
