---
title: CLI Share Command Split 2026-06-21
status: done
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/contracts
  - project/tasks
aliases:
  - 2026-06-21 CLI share command split
  - CLI share command split
---

# CLI Share Command Split 2026-06-21

> [!success]
> `agentfeed share` CLI surface orchestration을 `src/cli/index.ts`에서 `src/cli/share-command.ts`로 분리했다. Share argument parsing, collection execution, dry-run/token-missing JSON and human output, upload JSON/human output, confirmation guidance behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / CLI dispatcher 축소

## Cleanup Plan

1. 기존 share behavior를 새 wrapper tests와 기존 share collection/upload/output/CLI tests로 baseline 고정한다.
2. `cmdShare`의 parse, collection, JSON/human local output, upload result output, confirmation guidance orchestration을 전용 command module로 이동한다.
3. `src/cli/index.ts`는 cwd와 output writer만 전달하는 dispatcher로 축소한다.
4. focused tests, typecheck/build, full suite, dist CLI share smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `tests/share-command.test.ts`를 추가해 token-missing local JSON, uploaded JSON, human confirmation wrapper behavior를 먼저 잠갔다.
2. `src/cli/share-command.ts`를 추가했다.
3. `runShareCliCommand()`가 `parseShareArgs()`, `runShareCollectionCommand()`, `runShareUploadCommand()`, local/upload output rendering을 소유하게 했다.
4. `src/cli/index.ts`에서 share output/execution imports와 inline `cmdShare` 구현을 제거했다.
5. `cmdShare`는 `runShareCliCommand(args, { cwd, print, printLines })` 호출만 남겼다.

## Verification Evidence

Red check:

```text
npm test -- --run tests/share-command.test.ts
```

Result:

```text
failed as expected: Cannot find module '../src/cli/share-command.js'
```

Focused gates after implementation:

```text
npm test -- --run tests/share-command.test.ts
npm test -- --run tests/share-command.test.ts tests/share.test.ts tests/share-output.test.ts tests/share-collection-execution.test.ts tests/share-upload-execution.test.ts tests/cli-share.test.ts
npm test -- --run tests/cli-share.test.ts --hookTimeout=30000
npx tsc --noEmit --pretty false
npm run build
npm test -- --run
git diff --check
rg no-excuse audit on src/cli/index.ts, src/cli/share-command.ts, tests/share-command.test.ts
```

Result:

```text
new wrapper tests: 1 file / 3 tests passed
focused share helper tests: 5 files / 28 tests passed
first combined cli-share run: beforeAll build hook timed out at 10000ms
cli-share rerun with --hookTimeout=30000: 1 file / 54 tests passed
typecheck: passed
build: passed
full suite: 113 files / 841 tests passed
diff/no-excuse audit: passed
src/cli/index.ts pure LOC: 317
src/cli/share-command.ts pure LOC: 129
tests/share-command.test.ts pure LOC: 105
```

Manual dist CLI smoke:

```text
node dist/cli/index.js init --project-name share-command-smoke --no-git-check
node dist/cli/index.js share --dry --json --all --no-save-cursor
AGENTFEED_PLAIN=1 node dist/cli/index.js share --all --no-save-cursor
```

Smoke result:

```json
{
  "dryRun": true,
  "dryDraftId": "draft_20260621_203855_698a",
  "dryNextActions": 3,
  "humanHasPreview": true,
  "humanHasTokenGuidance": true
}
```

## Follow-up

> [!todo]
> `src/cli/index.ts` remains above the 250 pure LOC target. 후속 collect command split은 [[CLI Collect Command Split 2026-06-21]]에서 처리했다. Remaining dispatcher cleanup is still needed to get `src/cli/index.ts` under the 250 pure LOC target.

> [!todo]
> LSP diagnostics still fails locally with `Transport closed`; use `tsc --noEmit`, focused Vitest, build, full suite, and dist CLI smoke as replacement evidence for this slice.
