---
title: CLI Hook Command Split 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/hooks
  - agentfeed/refactor
  - evidence
status: done
aliases:
  - 2026-06-21 CLI hook command split
  - CLI hook command split
---

# CLI Hook Command Split 2026-06-21

> [!success]
> `legacy Claude Code hook lifecycle cleanup` orchestration을 `src/cli/index.ts`에서 `src/cli/hook-command.ts`로 분리했다. 기존 project/global scope resolution, project init guard, settings path override, dry-run/install/uninstall JSON/human output behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / command multiplexer 축소

## Cleanup Plan

1. 기존 hook behavior를 `tests/cli-init-hook.test.ts`, `tests/hook-output.test.ts`, command recovery/arg spec tests와 `tsc --noEmit`으로 baseline 고정한다.
2. legacy hook setup/uninstall side-effect orchestration을 전용 command module로 이동한다.
3. `src/cli/index.ts`는 process cwd와 output dependency만 전달하는 dispatcher로 축소한다.
4. focused tests, typecheck/build, full suite, dist CLI hook smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `src/cli/hook-command.ts`를 추가했다.
2. hook target validation, project root resolution, install-time project config guard, scope/settings-path/dry-run option handling을 새 module로 이동했다.
3. Claude Code legacy hook setup/uninstall execution 및 JSON/human output assembly를 새 module로 이동했다.
4. `src/cli/index.ts`에서 hook 전용 imports와 orchestration을 제거했다.
5. `cmdHook`는 `runHookCommand(args, { cwd, print, printLines })` 호출만 남겼다.

## Verification Evidence

Baseline before extraction:

```text
npm test -- --run tests/cli-init-hook.test.ts tests/hook-output.test.ts tests/cli-command-recovery-extra.test.ts tests/command-arg-specs.test.ts
npx tsc --noEmit --pretty false
```

Result:

```text
focused hook/recovery tests: Test Files 4 passed, Tests 36 passed
typecheck: passed
```

Post-extraction focused checks:

```text
npx tsc --noEmit --pretty false
npm run build
npm test -- --run tests/cli-init-hook.test.ts tests/hook-output.test.ts tests/cli-command-recovery-extra.test.ts tests/command-arg-specs.test.ts --hookTimeout=30000
```

Result:

```text
typecheck: passed
build: passed
postbuild ensure-bin-executable: passed
focused hook/recovery tests: Test Files 4 passed, Tests 36 passed
```

Size / no-excuse audit after extraction:

```text
src/cli/index.ts pure LOC: 585
src/cli/hook-command.ts pure LOC: 48
```


Final gate rerun before commit:

```text
npx tsc --noEmit --pretty false
npm run build
npm test -- --run tests/cli-init-hook.test.ts tests/hook-output.test.ts tests/cli-command-recovery-extra.test.ts tests/command-arg-specs.test.ts --hookTimeout=30000
npm test -- --run
git diff --check
rg no-excuse audit on src/cli/index.ts and src/cli/hook-command.ts
dist CLI legacy hook setup dry-run/install/uninstall smoke in isolated temp cwd/home
```

Result:

```text
typecheck: passed
build: passed
postbuild ensure-bin-executable: passed
focused hook/recovery tests: Test Files 4 passed, Tests 36 passed
full suite: Test Files 110 passed, Tests 831 passed
diff/no-excuse audit: passed
src/cli/index.ts pure LOC: 585
src/cli/hook-command.ts pure LOC: 48
dist CLI hook smoke: passed; dry-run human/json, install settings write, uninstall JSON, hook removal verified
```

Smoke assertions:

- `agentfeed init --no-git-check --project-name hook-split-smoke --json` ran in temp cwd.
- `legacy hook dry-run smoke (deprecated)` human output contained dry-run heading and install next action.
- `legacy hook dry-run JSON smoke (deprecated)` parsed successfully with `action: install`, `dry_run: true`, `backup_path: null`.
- Dry-run did not create `.claude/settings.json`.
- `legacy Claude Code hook setup` (deprecated) human output contained installed heading and wrote the Claude Code Stop hook command.
- `agentfeed hook uninstall claude-code --json` parsed successfully with `action: uninstall`, no `dry_run`, and `agentfeed status` next action.
- Post-uninstall settings no longer contained the AgentFeed Claude Code Stop hook marker.

## Follow-up

> [!todo]
> 후속 command surface split은 [[CLI Command Surface Split 2026-06-21]]에서 처리했다. `src/cli/index.ts` remains above the 250 pure LOC target because collect/share/publish orchestration still lives there.

> [!todo]
> LSP diagnostics currently fail locally with `Transport closed`. This slice used `tsc --noEmit`, focused Vitest, build, full suite, and dist CLI smoke as replacement evidence.
