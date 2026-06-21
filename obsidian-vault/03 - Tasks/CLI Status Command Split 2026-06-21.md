---
title: CLI Status Command Split 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/diagnostics
  - agentfeed/refactor
  - evidence
status: done
aliases:
  - 2026-06-21 CLI status command split
  - CLI status command split
---

# CLI Status Command Split 2026-06-21

> [!success]
> `agentfeed status` orchestration을 `src/cli/index.ts`에서 `src/cli/status-command.ts`로 분리했다. 기존 human/json status output, project detection, pending upload count, Claude Code hook diagnostics, readiness/next-action behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / command multiplexer 축소

## Cleanup Plan

1. 기존 status behavior를 `tests/cli-status-doctor.test.ts -t "status"`와 `tsc --noEmit`으로 baseline 고정한다.
2. status pending draft 판정, Claude hook status check, readiness/output assembly를 전용 command module로 이동한다.
3. `src/cli/index.ts`는 process cwd와 output dependency만 전달하는 dispatcher로 축소한다.
4. focused tests, typecheck/build, dist CLI status human/json smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `src/cli/status-command.ts`를 추가했다.
2. `draftUploadPendingForStatus`, Claude Code hook status read, status output assembly를 새 module로 이동했다.
3. `src/cli/index.ts`에서 status 전용 imports와 orchestration을 제거했다.
4. `cmdStatus`는 `runStatusCommand(args, { cwd, print, printLines })` 호출만 남겼다.
5. 새 module의 draft upload JSON boundary는 `isRecord()` narrowing으로 처리해 type assertion을 추가하지 않았다.

## Verification Evidence

Baseline before extraction:

```text
npm test -- --run tests/cli-status-doctor.test.ts -t "status"
npx tsc --noEmit --pretty false
```

Result:

```text
status focused: Test Files 1 passed, Tests 38 passed
baseline typecheck: passed
```

Post-extraction focused checks:

```text
npx tsc --noEmit --pretty false
npm run build
npm test -- --run tests/cli-status-doctor.test.ts -t "status"
```

Result:

```text
typecheck: passed
build: passed
postbuild ensure-bin-executable: passed
status focused: Test Files 1 passed, Tests 38 passed
```

Manual dist CLI smoke in isolated temp cwd/home:

```json
{
  "ok": true,
  "health": "setup needed",
  "readiness_count": 5,
  "human_lines": 37
}
```

Smoke assertions:

- `agentfeed init --no-git-check --project-name status-split-smoke --json` ran in temp cwd.
- `agentfeed status` human output contained heading, readiness, next section, and project name.
- `agentfeed status --json` parsed successfully.
- JSON payload preserved `project.initialized: true`, `project.name: status-split-smoke`, and `account.token_source: missing`.
- JSON output did not contain token-like secret text.

## Follow-up

> [!success]
> 후속 doctor command split은 [[CLI Doctor Command Split 2026-06-21]]에서 처리했다. 후속 hook command split은 [[CLI Hook Command Split 2026-06-21]]에서 처리했다. 남은 구조 정리 후보는 collect/share/publish, help/completion dispatch다.

> [!todo]
> LSP diagnostics currently fail locally with `Transport closed`. This slice used `tsc --noEmit`, focused Vitest, build, and dist CLI smoke as replacement evidence.
