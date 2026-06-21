---
title: CLI Doctor Command Split 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/diagnostics
  - agentfeed/refactor
  - evidence
status: done
aliases:
  - 2026-06-21 CLI doctor command split
  - CLI doctor command split
---

# CLI Doctor Command Split 2026-06-21

> [!success]
> `agentfeed doctor` orchestration을 `src/cli/index.ts`에서 `src/cli/doctor-command.ts`로 분리했다. 기존 runtime/account/API/project/collection/agent-signal diagnostics, JSON/human output, readiness/next-action behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / command multiplexer 축소

## Cleanup Plan

1. 기존 doctor/status diagnostics behavior를 `tests/cli-status-doctor.test.ts -t "doctor|status"`와 `tsc --noEmit`으로 baseline 고정한다.
2. doctor runtime/account/API/project/collection/agent-signal check assembly를 전용 command module로 이동한다.
3. `src/cli/index.ts`는 process cwd, Node version, output dependency만 전달하는 dispatcher로 축소한다.
4. focused tests, typecheck/build, dist CLI doctor human/json smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `src/cli/doctor-command.ts`를 추가했다.
2. API reachability/compatibility, ingestion token check, project/collection state, agent signal summary, readiness/next-action assembly를 새 module로 이동했다.
3. `src/cli/index.ts`에서 doctor 전용 imports와 orchestration을 제거했다.
4. `cmdDoctor`는 `runDoctorCommand(args, { cwd, nodeVersion, print, printLines })` 호출만 남겼다.

## Verification Evidence

Baseline before extraction:

```text
npm test -- --run tests/cli-status-doctor.test.ts -t "doctor|status"
npx tsc --noEmit --pretty false
```

Result:

```text
doctor/status focused: Test Files 1 passed, Tests 38 passed
baseline typecheck: passed
```

Post-extraction focused checks:

```text
npx tsc --noEmit --pretty false
npm run build
npm test -- --run tests/cli-status-doctor.test.ts -t "doctor|status"
```

Result:

```text
typecheck: passed
build: passed
postbuild ensure-bin-executable: passed
doctor/status focused: Test Files 1 passed, Tests 38 passed
```

Manual dist CLI smoke in isolated temp cwd/home:

```json
{
  "ok": true,
  "summary": {
    "status": "attention_needed",
    "ready": 2,
    "attention": 4
  },
  "project_rows": 2,
  "human_lines": 88
}
```

Smoke assertions:

- `agentfeed init --no-git-check --project-name doctor-split-smoke --json` ran in temp cwd.
- `agentfeed doctor` human output contained heading, summary, and next section.
- `agentfeed doctor --json` parsed successfully.
- JSON payload preserved summary status, project config valid row, and missing credential source.
- JSON output did not contain token-like secret text.

Final gate rerun before commit:

```text
npx tsc --noEmit --pretty false
npm run build
npm test -- --run tests/cli-status-doctor.test.ts -t "doctor|status"
npm test -- --run
git diff --check
rg no-excuse audit on src/cli/index.ts and src/cli/doctor-command.ts
dist CLI doctor human/json smoke against local fake API
```

Result:

```text
typecheck: passed
build: passed
focused doctor/status: Test Files 1 passed, Tests 38 passed
full suite: Test Files 110 passed, Tests 831 passed
diff/no-excuse audit: passed
src/cli/index.ts pure LOC: 618
src/cli/doctor-command.ts pure LOC: 153
dist CLI doctor smoke: passed; summary status attention_needed, ready 3, attention 3, human_lines 88, project_rows 2
```

## Follow-up

> [!todo]
> 후속 hook command split은 [[CLI Hook Command Split 2026-06-21]]에서 처리했다. `src/cli/index.ts` remains above the 250 pure LOC target because collect/share/publish and help/completion dispatch still live there.

> [!todo]
> LSP diagnostics currently fail locally with `Transport closed`. This slice used `tsc --noEmit`, focused Vitest, build, and dist CLI smoke as replacement evidence.
