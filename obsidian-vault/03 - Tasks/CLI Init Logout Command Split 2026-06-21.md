---
title: CLI Init Logout Command Split 2026-06-21
status: done
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/contracts
  - project/tasks
aliases:
  - 2026-06-21 CLI init logout command split
  - CLI init logout command split
---

# CLI Init Logout Command Split 2026-06-21

> [!success]
> `agentfeed init` and `agentfeed logout` CLI surface orchestration을 `src/cli/index.ts`에서 `src/cli/init-command.ts`, `src/cli/logout-command.ts`로 분리했다. Init project option mapping, JSON/human output, logout credential deletion, environment-token warning behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / CLI dispatcher size cleanup

## Cleanup Plan

1. 기존 init/logout behavior를 새 wrapper tests와 기존 output/CLI tests로 baseline 고정한다.
2. `cmdInit`의 project initialization and output orchestration을 전용 command module로 이동한다.
3. `cmdLogout`의 saved credential deletion and output orchestration을 전용 command module로 이동한다.
4. `src/cli/index.ts`는 cwd/env/output writer만 전달하는 dispatcher로 축소한다.
5. focused tests, typecheck/build, full suite, dist CLI smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `tests/init-command.test.ts`를 추가해 init JSON/human wrapper behavior를 먼저 잠갔다.
2. `tests/logout-command.test.ts`를 추가해 logout JSON/human wrapper behavior를 먼저 잠갔다.
3. `src/cli/init-command.ts`를 추가했다.
4. `src/cli/logout-command.ts`를 추가했다.
5. `src/cli/index.ts`에서 init/logout-specific imports and inline command bodies를 제거했다.
6. 이전 split 과정에서 남은 unused legacy helper/imports를 제거해 `src/cli/index.ts`를 230 pure LOC로 낮췄다.

## Verification Evidence

Red check:

```text
npm test -- --run tests/init-command.test.ts tests/logout-command.test.ts
```

Result:

```text
failed as expected: Cannot find module '../src/cli/init-command.js'
failed as expected: Cannot find module '../src/cli/logout-command.js'
```

Focused gates after implementation:

```text
npm test -- --run tests/init-command.test.ts tests/logout-command.test.ts tests/init-output.test.ts tests/logout-output.test.ts
npm test -- --run tests/cli-status-doctor.test.ts -t "logout|init" --hookTimeout=30000
npm test -- --run tests/cli-help.test.ts -t "init|logout"
npx tsc --noEmit --pretty false
npm run build
npm test -- --run
git diff --check
rg no-excuse audit on src/cli/index.ts, src/cli/init-command.ts, src/cli/logout-command.ts, tests/init-command.test.ts, tests/logout-command.test.ts
```

Result:

```text
new wrapper/output tests: 4 files / 11 tests passed
focused CLI init/logout tests: 1 file / 4 passed, 34 skipped
focused help tests: 1 file / 1 passed, 37 skipped
typecheck: passed
build: passed
full suite: 116 files / 848 tests passed
diff/no-excuse audit: passed
src/cli/index.ts pure LOC: 230
src/cli/init-command.ts pure LOC: 39
src/cli/logout-command.ts pure LOC: 25
tests/init-command.test.ts pure LOC: 48
tests/logout-command.test.ts pure LOC: 38
```

Manual dist CLI smoke:

```text
node dist/cli/index.js init --project-name init-logout-smoke --json
AGENTFEED_HOME="$home" node dist/cli/index.js logout --json
```

Smoke result:

```json
{
  "initProject": "init-logout-smoke",
  "initConfigPath": ".agentfeed/config.json",
  "initNextActions": 3,
  "logoutDeleted": false,
  "logoutEnvTokenActive": false,
  "logoutNextActions": ["agentfeed status"]
}
```

## Follow-up

> [!todo]
> `src/cli/index.ts` is now under the 250 pure LOC target. Remaining inline command candidates are `preview` and `scan`, but they are below the current size threshold and should only be split if future changes expand the dispatcher again.

> [!todo]
> LSP diagnostics still fails locally with `Transport closed`; use `tsc --noEmit`, focused Vitest, build, full suite, and dist CLI smoke as replacement evidence for this slice.
