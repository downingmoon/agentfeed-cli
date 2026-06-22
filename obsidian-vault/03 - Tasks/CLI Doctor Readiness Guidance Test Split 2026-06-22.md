---
title: CLI Doctor Readiness Guidance Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI doctor readiness guidance test split
  - CLI doctor readiness guidance test split
---

# CLI Doctor Readiness Guidance Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 doctor setup ordering, initialized-project dry-run discoverability, remote HTTP API remediation coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `c906479 Split CLI doctor readiness guidance tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-doctor-readiness-guidance.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / doctor readiness guidance suite isolation

## Background

[[CLI Status Local State Diagnostics Test Split 2026-06-22]] follow-up에 남아 있던 doctor setup/action ordering and API remediation clusters를 처리했다. 이번 pass는 `agentfeed doctor`의 local setup ordering, login/share guidance, invalid remote HTTP API remediation coverage를 purpose-named suite로 이동했다.

## Changes

- `tests/cli-doctor-readiness-guidance.test.ts` 추가.
  - Multiple checks fail 상태에서 local setup actions와 API recheck가 함께 표시되고 `git init && agentfeed init` → `agentfeed login` → `agentfeed doctor` 순서로 안내되는 계약을 보존했다.
  - Initialized project가 login만 빠졌을 때 `agentfeed login`과 `agentfeed share --dry` discoverability가 유지되는 계약을 보존했다.
  - Environment API URL이 remote HTTP일 때 command가 실패하지 않고 `unset AGENTFEED_API_BASE_URL` remediation을 표시하는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 doctor readiness guidance test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "doctor lists local setup actions|doctor keeps local dry-run sharing discoverable|doctor reports remediation instead of failing": 1 file / 3 tests passed / 8 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-doctor-readiness-guidance.test.ts -t "doctor lists local setup actions|doctor keeps local dry-run sharing discoverable|doctor reports remediation instead of failing": 1 file passed / 1 skipped, 3 tests passed / 8 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-doctor-readiness-guidance.test.ts: 2 files / 11 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 161 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new doctor readiness suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 324 pure LOC after split; still oversized.
tests/cli-doctor-readiness-guidance.test.ts: 153 pure LOC.
```

## Follow-up

> [!success]
> Status output/ANSI diagnostics follow-up was completed by [[CLI Status Output Contract Test Split 2026-06-22]]. `tests/cli-status-doctor.test.ts` is now 202 pure LOC and below the 250 pure LOC ceiling.

> [!todo]
> Continue enterprise hardening by scanning the next oversized or contract-risk CLI/Frontend/Backend surface before editing. Preserve baseline coverage before each split or contract cleanup.
