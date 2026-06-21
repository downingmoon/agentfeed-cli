---
title: CLI Collect Command Split 2026-06-21
status: done
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/contracts
  - project/tasks
aliases:
  - 2026-06-21 CLI collect command split
  - CLI collect command split
---

# CLI Collect Command Split 2026-06-21

> [!success]
> `agentfeed collect` CLI surface orchestration을 `src/cli/index.ts`에서 `src/cli/collect-command.ts`로 분리했다. Collection window resolution, source/session parsing, upload credential precheck, JSON/human output, JSON upload, human publish delegation, cursor persistence, auto-upload ignored warning behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / CLI dispatcher 축소

## Cleanup Plan

1. 기존 collect behavior를 새 wrapper tests와 기존 collect output/upload/CLI tests로 baseline 고정한다.
2. `cmdCollect`의 source parsing, collection window, draft collection, JSON/human rendering, upload delegation, cursor persistence orchestration을 전용 command module로 이동한다.
3. `src/cli/index.ts`는 cwd, output writer, publish callback만 전달하는 dispatcher로 축소한다.
4. focused tests, typecheck/build, full suite, dist CLI collect smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `tests/collect-command.test.ts`를 추가해 JSON collect cursor persistence, human `--upload` publish delegation, upload credential precheck behavior를 먼저 잠갔다.
2. `src/cli/collect-command.ts`를 추가했다.
3. `runCollectCliCommand()`가 collect flags parsing, project config load, collection window resolution, `collectDraftWithStatus()`, output rendering, JSON upload, cursor persistence를 소유하게 했다.
4. Human `--upload`은 `publish` callback으로 위임해 `src/cli/index.ts` import cycle 없이 기존 publish path를 재사용하게 했다.
5. `src/cli/index.ts`에서 collect-specific imports와 inline `cmdCollect` 구현을 제거했다.
6. `cmdCollect`는 `runCollectCliCommand(args, { cwd, print, printLines, publish: cmdPublish })` 호출만 남겼다.

## Verification Evidence

Red check:

```text
npm test -- --run tests/collect-command.test.ts
```

Result:

```text
failed as expected: Cannot find module '../src/cli/collect-command.js'
```

Focused gates after implementation:

```text
npm test -- --run tests/collect-command.test.ts
npm test -- --run --hookTimeout=30000 tests/collect-command.test.ts tests/cli-collect.test.ts tests/collect-output.test.ts tests/collect-upload-execution.test.ts
npx tsc --noEmit --pretty false
npm run build
npm test -- --run
git diff --check
rg no-excuse audit on src/cli/index.ts, src/cli/collect-command.ts, tests/collect-command.test.ts
```

Result:

```text
new wrapper tests: 1 file / 3 tests passed
first combined collect run: cli-collect beforeAll build hook timed out at 10000ms
combined collect rerun with --hookTimeout=30000: 4 files / 30 tests passed
typecheck: passed
build: passed
full suite: 114 files / 844 tests passed
diff/no-excuse audit: passed
src/cli/index.ts pure LOC: 280
src/cli/collect-command.ts pure LOC: 104
tests/collect-command.test.ts pure LOC: 84
```

Manual dist CLI smoke:

```text
node dist/cli/index.js init --project-name collect-command-smoke --no-git-check
node dist/cli/index.js collect --json --all --no-save-cursor
AGENTFEED_PLAIN=1 node dist/cli/index.js collect --all --no-save-cursor --explain
```

Smoke result:

```json
{
  "draftId": "draft_20260621_205401_b895",
  "nextActions": 2,
  "humanHasReady": true,
  "humanHasSummary": true,
  "humanHasNext": true
}
```

## Follow-up

> [!todo]
> `src/cli/index.ts` remains above the 250 pure LOC target. Collect orchestration is now handled here, but the dispatcher still needs another behavior-preserving split pass before it reaches the target.

> [!todo]
> LSP diagnostics still fails locally with `Transport closed`; use `tsc --noEmit`, focused Vitest, build, full suite, and dist CLI smoke as replacement evidence for this slice.
