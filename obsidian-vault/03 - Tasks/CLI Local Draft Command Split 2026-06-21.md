---
title: CLI Local Draft Command Split 2026-06-21
status: done
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/contracts
  - project/tasks
aliases:
  - 2026-06-21 CLI local draft command split
  - CLI local draft command split
---

# CLI Local Draft Command Split 2026-06-21

> [!success]
> `agentfeed drafts`, `agentfeed discard`, `agentfeed open` local draft orchestration을 `src/cli/index.ts`에서 `src/cli/local-draft-command.ts`로 분리했다. Draft list JSON/human output, discard confirmation/delete output, open review JSON/human output behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / CLI dispatcher 축소

## Cleanup Plan

1. 기존 local draft command behavior를 새 wrapper tests와 기존 CLI drafts/open/discard tests로 baseline 고정한다.
2. `drafts`, `discard`, `open`의 command orchestration을 전용 module로 이동한다.
3. `src/cli/index.ts`는 cwd, output writer, draft id resolver dependency만 전달하는 dispatcher로 축소한다.
4. focused tests, typecheck/build, full suite, dist CLI smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `tests/local-draft-command.test.ts`를 추가해 draft list JSON, discard confirmation, open JSON wrapper behavior를 먼저 잠갔다.
2. `src/cli/local-draft-command.ts`를 추가했다.
3. `runDraftsCliCommand()`, `runDiscardCliCommand()`, `runOpenCliCommand()`가 local draft command orchestration을 소유하게 했다.
4. `src/cli/index.ts`에서 draft list, discard, open execution/rendering imports와 inline 구현을 제거했다.
5. `cmdDrafts`, `cmdDiscard`, `cmdOpen`은 새 wrapper 호출만 남겼다.

## Verification Evidence

Red check:

```text
npm test -- --run tests/local-draft-command.test.ts
```

Result:

```text
failed as expected: Cannot find module '../src/cli/local-draft-command.js'
```

Focused gates after implementation:

```text
npm test -- --run tests/local-draft-command.test.ts
npm test -- --run tests/local-draft-command.test.ts tests/cli-drafts.test.ts tests/open-command.test.ts tests/open-execution.test.ts tests/open-draft-resolver.test.ts tests/draft-list-output.test.ts tests/draft-list-rows.test.ts tests/discard-command.test.ts
npx tsc --noEmit --pretty false
npm run build
npm test -- --run
git diff --check
rg no-excuse audit on src/cli/index.ts, src/cli/local-draft-command.ts, tests/local-draft-command.test.ts
```

Result:

```text
new wrapper tests: 1 file / 3 tests passed
focused local draft tests: 8 files / 45 tests passed
typecheck: passed
build: passed
full suite: 112 files / 838 tests passed
diff/no-excuse audit: passed
src/cli/index.ts pure LOC: 419
src/cli/local-draft-command.ts pure LOC: 122
tests/local-draft-command.test.ts pure LOC: 89
```

Manual dist CLI smoke:

```text
node dist/cli/index.js init --project-name local-draft-smoke --no-git-check
node dist/cli/index.js drafts --json
node dist/cli/index.js discard --id draft_local_smoke_pending --json
AGENTFEED_TEST_DISABLE_REAL_BROWSER=1 node dist/cli/index.js open --id draft_local_smoke_uploaded --json
```

Smoke result:

```json
{
  "draftsTotal": 2,
  "discardConfirmation": true,
  "openDraftId": "draft_local_smoke_uploaded",
  "openWarningCount": 1,
  "pendingStillExists": true
}
```

## Follow-up

> [!todo]
> `src/cli/index.ts` remains above the 250 pure LOC target. 후속 share command split은 [[CLI Share Command Split 2026-06-21]]에서 처리했다. 후속 collect command split은 [[CLI Collect Command Split 2026-06-21]]에서 처리했다. Remaining dispatcher cleanup is still needed to get `src/cli/index.ts` under the 250 pure LOC target.

> [!todo]
> LSP diagnostics still fails locally with `Transport closed`; use `tsc --noEmit`, focused Vitest, build, full suite, and dist CLI smoke as replacement evidence for this slice.
