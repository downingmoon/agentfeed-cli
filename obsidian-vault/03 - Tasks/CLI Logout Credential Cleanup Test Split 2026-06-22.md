---
title: CLI Logout Credential Cleanup Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI logout credential cleanup test split
  - CLI logout credential cleanup test split
---

# CLI Logout Credential Cleanup Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 logout credential cleanup coverage를 focused suite로 분리했다. JSON/human logout output, saved credential deletion, environment token warning, and secret non-leak behavior를 그대로 보존했고, CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `d360a92 Split CLI logout credential cleanup tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-logout-credential-cleanup.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / logout credential cleanup suite isolation

## Background

[[CLI Doctor API Health Test Split 2026-06-22]] follow-up에 남아 있던 cohesive split 후보 중 logout credential cleanup은 login/rotate/status/doctor diagnostics와 독립적인 CLI command surface였다. 이번 pass는 해당 2개 logout tests만 분리해 oversized suite를 더 줄였다.

## Changes

- `tests/cli-logout-credential-cleanup.test.ts` 추가.
  - `agentfeed logout --json`이 saved credentials를 삭제하고 active `AGENTFEED_TOKEN` warning/security checklist/next action을 출력하는 계약을 보존했다.
  - human `agentfeed logout` output이 credential removal summary/security checklist/next action을 표시하고 secret을 stdout/stderr에 누출하지 않는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 logout cleanup test cases를 제거했다.
- Shared CLI process fixture만 새 suite에 복제했고 production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "logout": 1 file / 2 tests passed / 34 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-logout-credential-cleanup.test.ts -t "logout": 2 tests passed / 34 skipped
Targeted split after rebuild: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-logout-credential-cleanup.test.ts: 2 files / 36 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 150 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new logout cleanup suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 1407 pure LOC after split; still oversized, but reduced by another isolated contract cluster.
tests/cli-logout-credential-cleanup.test.ts: 91 pure LOC; focused logout credential cleanup suite.
```

## Follow-up

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 1407 pure LOC. Continue only by cohesive behavior clusters such as login token-stdin, rotate session replacement, or status project/readiness diagnostics, and preserve baseline coverage before each split.
