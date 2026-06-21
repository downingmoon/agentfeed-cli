---
title: CLI Publish Command Split 2026-06-21
status: done
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/contracts
  - project/tasks
aliases:
  - 2026-06-21 CLI publish command split
  - CLI publish command split
---

# CLI Publish Command Split 2026-06-21

> [!success]
> `agentfeed publish` CLI surface orchestration을 `src/cli/index.ts`에서 `src/cli/publish-command.ts`로 분리했다. Draft id resolution, publish execution, confirmation guidance, JSON payload, human upload result behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / command multiplexer 축소

## Cleanup Plan

1. 기존 publish behavior를 새 wrapper 테스트, publish execution/output tests, `tsc --noEmit`으로 baseline 고정한다.
2. `cmdPublish`의 argument flag mapping, confirmation output, JSON/human output assembly를 전용 command module로 이동한다.
3. `src/cli/index.ts`는 cwd, output writer, draft id resolver dependency만 전달하는 dispatcher로 축소한다.
4. focused tests, typecheck/build, full suite, dist CLI publish smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `tests/publish-command.test.ts`를 추가해 JSON publish payload and confirmation guidance CLI wrapper behavior를 먼저 잠갔다.
2. `src/cli/publish-command.ts`를 추가했다.
3. `runPublishCliCommand()`가 publish flags mapping, `runPublishCommand()` 호출, confirmation/JSON/human output rendering을 소유하게 했다.
4. `src/cli/index.ts`에서 publish output/execution imports와 `cmdPublish` 구현을 제거했다.
5. `cmdPublish`는 `runPublishCliCommand(args, { cwd, print, printLines, resolveDraftId })` 호출만 남겼다.

## Verification Evidence

Red check:

```text
npm test -- --run tests/publish-command.test.ts
```

Result:

```text
failed as expected: Cannot find module '../src/cli/publish-command.js'
```

Focused gates after implementation:

```text
npm test -- --run tests/publish-command.test.ts tests/publish-execution.test.ts tests/publish-output.test.ts
npx tsc --noEmit --pretty false
npm run build
npm test -- --run tests/cli-share.test.ts -t publish --hookTimeout=30000
npm test -- --run
git diff --check
rg no-excuse audit on src/cli/index.ts, src/cli/publish-command.ts, tests/publish-command.test.ts
```

Result:

```text
focused publish tests: 3 files / 8 tests passed
typecheck: passed
build: passed
cli-share publish filtered test: 1 file / 15 passed, 39 skipped
full suite: 111 files / 835 tests passed
diff/no-excuse audit: passed
src/cli/index.ts pure LOC: 479
src/cli/publish-command.ts pure LOC: 43
tests/publish-command.test.ts pure LOC: 66
```

Manual dist CLI smoke:

```text
node dist/cli/index.js publish --id draft_publish_command_smoke --yes --json --no-open-review --no-clipboard
```

Result:

```json
{
  "code": 0,
  "stderr": "",
  "draftId": "draft_publish_command_smoke",
  "uploadId": "worklog_publish_command_smoke",
  "hasOpenNextAction": true,
  "requests": [
    "GET /v1/metadata",
    "GET /v1/ingest/status",
    "POST /v1/ingest/worklogs"
  ]
}
```

## Follow-up

> [!todo]
> `src/cli/index.ts` remains above the 250 pure LOC target. Remaining structural candidates are collect/share orchestration and local draft/open/scan/discard dispatch.

> [!todo]
> LSP diagnostics has been failing locally with `Transport closed`; use `tsc --noEmit`, focused Vitest, build, full suite, and dist CLI smoke as replacement evidence for this slice.
