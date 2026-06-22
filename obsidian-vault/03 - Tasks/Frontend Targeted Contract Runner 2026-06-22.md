---
title: Frontend Targeted Contract Runner 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/tooling
  - project/tasks
aliases:
  - 2026-06-22 frontend targeted contract runner
  - Frontend targeted contract runner
---

# Frontend Targeted Contract Runner 2026-06-22

> [!success]
> Frontend contract runner가 직접 파일 인자를 받아 선택 contract만 실행할 수 있게 보강했다. `node scripts/run-contract-tests.mjs <contract-file>` 직접 실행 시 npm script PATH에 의존하지 않도록 local `node_modules/.bin/tsc`를 우선 사용한다.

## Scope

- 대상 repo: `agentfeed-frontend`
- Commit: `847c308 Support targeted frontend contract tests`
- 변경 파일:
  - `scripts/run-contract-tests.mjs`
  - `scripts/run-contract-tests.contract.test.mjs`
  - `scripts/contract-test-sources.mjs`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: contract test tooling hardening / verification precision

## Background

[[Frontend Stale Contract TODO Reconciliation 2026-06-22]] 검증 중 다음 직접 실행 명령이 실패했다.

```text
node scripts/run-contract-tests.mjs src/lib/project-visibility-source-contract.test.ts src/lib/worklog-card-source-contract.test.ts src/lib/worklog-review-strict-fields.contract.test.ts
```

당시 실패 원인은 두 가지였다.

1. `run-contract-tests.mjs`가 파일 인자를 해석하지 않아 항상 전체 suite를 실행했다.
2. 직접 `node scripts/run-contract-tests.mjs ...`로 실행하면 npm script가 주입하는 `node_modules/.bin` PATH가 없어 `tsc` 해석이 실패할 수 있었다.

## Changes

- `run-contract-tests.mjs`가 optional target arguments를 해석한다.
  - 인자가 없으면 기존처럼 전체 contract suite를 실행한다.
  - `src/lib/*.contract.test.ts` target은 선택 컴파일 후 해당 emitted JS만 실행한다.
  - `scripts/*.contract.test.mjs` direct target도 선택 실행할 수 있다.
  - 알 수 없는 target은 명시적으로 실패한다.
- local `node_modules/.bin/tsc`를 우선 사용해 npm PATH 없이도 직접 실행 가능하게 했다.
- 선택 컴파일 시 TypeScript emit root가 달라지는 경우를 처리하도록 compiled target lookup을 nested/flat 두 경로로 보정했다.
- `scripts/run-contract-tests.contract.test.mjs`를 추가해 직접 실행과 unknown-target failure를 회귀 방지한다.

## Verification Evidence

```text
node scripts/run-contract-tests.mjs src/lib/project-visibility-source-contract.test.ts: passed
node scripts/run-contract-tests.mjs scripts/run-contract-tests.contract.test.mjs: passed
node scripts/run-contract-tests.mjs src/lib/not-a-contract.test.ts: failed as expected with Unknown contract test target(s)
npm run lint: passed
npm run test:contracts: passed
git diff --check: passed
```

Changed-file audit:

```text
scripts/run-contract-tests.mjs: 71 pure LOC
scripts/run-contract-tests.contract.test.mjs: 30 pure LOC
scripts/contract-test-sources.mjs: 132 pure LOC
no no-excuse markers or TODO/FIXME additions
```

## Follow-up

> [!todo]
> Future contract-slice work can use `node scripts/run-contract-tests.mjs <target>` for narrow validation, then still run full `npm run test:contracts` before commit when the change affects shared runner/source lists.
