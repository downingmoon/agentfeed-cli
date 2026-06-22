---
title: CLI Doctor API Health Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI doctor API health test split
  - CLI doctor API health test split
---

# CLI Doctor API Health Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 doctor API health diagnostics coverage를 focused suite로 분리했다. DNS failure remediation and remote token-expiry warning behavior를 그대로 보존했고, CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `19705fb Split CLI doctor API health tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-doctor-api-health.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / doctor API health diagnostics suite isolation

## Background

[[CLI Share Command Residual Test Split 2026-06-22]]의 follow-up에 남아 있던 broader CLI test-suite hardening 후보 중 `tests/cli-status-doctor.test.ts`가 현재 1575 pure LOC로 가장 큰 CLI test file이었다. 이번 pass는 그중 doctor API DNS/remote-token health diagnostics처럼 독립적인 CLI surface cluster만 먼저 분리해 risk를 좁혔다.

## Changes

- `tests/cli-doctor-api-health.test.ts` 추가.
  - doctor가 API DNS failure를 host name과 API base remediation으로 설명하는 계약을 보존했다.
  - doctor가 remote `/health/ready`, `/v1/metadata`, `/v1/ingest/status`를 통해 token expiry를 표시하고 expiring-soon warning/rotate action을 표시하는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 해당 두 test case를 제거했다.
- Shared CLI process fixture만 새 suite에 복제했고 production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts: 1 file / 38 tests passed
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-doctor-api-health.test.ts: 2 files / 38 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 149 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new doctor API health suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 1473 pure LOC after split; still oversized, but reduced by an isolated contract cluster.
tests/cli-doctor-api-health.test.ts: 127 pure LOC; focused API health diagnostics suite.
```

## Follow-up

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 1473 pure LOC. Continue only by cohesive behavior clusters such as login token-stdin, rotate session replacement, logout credential cleanup, or status project/readiness diagnostics, and preserve baseline coverage before each split.
