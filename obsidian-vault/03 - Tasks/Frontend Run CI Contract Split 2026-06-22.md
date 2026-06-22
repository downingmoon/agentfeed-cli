---
title: Frontend Run CI Contract Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/tooling
  - project/tasks
aliases:
  - 2026-06-22 frontend run ci contract split
  - Frontend run-ci contract split
---

# Frontend Run CI Contract Split 2026-06-22

> [!success]
> Frontend `scripts/run-ci.contract.test.mjs`의 oversized direct Node contract를 core CI ordering, hosted guard, failure propagation 책임별 suite로 분리했다. `run-ci.mjs` 런타임 동작 변경 없이 contract runner registry에 새 targets를 등록했다.

## Scope

- 대상 repo: `agentfeed-frontend`
- Commit:
  - `012e430 Split frontend run-ci contract coverage`
- 변경 파일:
  - `scripts/run-ci.contract.test.mjs`
  - `scripts/run-ci-hosted-guard.contract.test.mjs`
  - `scripts/run-ci-failure-propagation.contract.test.mjs`
  - `scripts/run-ci-contract-helpers.mjs`
  - `scripts/contract-test-sources.mjs`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 런타임 변경 없음. Frontend local contract tooling test organization only.
- 배포: 수행하지 않음
- 성격: contract test decomposition / CI contract reviewability hardening

## Background

`Frontend Targeted Contract Runner 2026-06-22` 이후 direct Node contract targets도 registry coverage로 보호된다. 남은 큰 direct target인 `scripts/run-ci.contract.test.mjs`는 fake npm helper, default ordering, hosted CI guard, skip guard, hosted readiness/root smoke, failure propagation, timeout fail-closed coverage를 한 파일에 함께 담고 있었고 pure LOC가 457이었다.

## Changes

- 공통 fake npm harness와 assertion helpers를 `scripts/run-ci-contract-helpers.mjs`로 이동했다.
- `scripts/run-ci.contract.test.mjs`는 core success/default/opt-in/opt-out ordering 계약만 남겼다.
- `scripts/run-ci-hosted-guard.contract.test.mjs`를 추가해 hosted CI readiness URL, production compatibility skip guard, explicit production API URL fail-closed 계약을 분리했다.
- `scripts/run-ci-failure-propagation.contract.test.mjs`를 추가해 hosted readiness/root smoke/audit/API compatibility failure propagation과 timeout fail-closed 계약을 분리했다.
- `scripts/contract-test-sources.mjs` directNodeTargets에 새 contract files를 등록했다.

## Verification Evidence

```text
Baseline: node scripts/run-contract-tests.mjs scripts/run-ci.contract.test.mjs: passed
Split targets: node scripts/run-contract-tests.mjs scripts/run-ci.contract.test.mjs scripts/run-ci-hosted-guard.contract.test.mjs scripts/run-ci-failure-propagation.contract.test.mjs: passed
Registry self-test: node scripts/run-contract-tests.mjs scripts/run-contract-tests.contract.test.mjs: passed
Full frontend contracts: npm run test:contracts: passed
Typecheck/lint: npm run lint: passed
Git whitespace: git diff --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch additions in changed run-ci contract files
```

Changed-file LOC audit:

```text
scripts/run-ci.contract.test.mjs: 104 pure LOC
scripts/run-ci-hosted-guard.contract.test.mjs: 99 pure LOC
scripts/run-ci-failure-propagation.contract.test.mjs: 146 pure LOC
scripts/run-ci-contract-helpers.mjs: 79 pure LOC
scripts/contract-test-sources.mjs: 134 pure LOC
```

## Follow-up

> [!todo]
> Frontend page components remain oversized and should be reduced only with behavior-locked, UI-surface verification slices. No page/runtime refactor was included in this contract tooling task.
