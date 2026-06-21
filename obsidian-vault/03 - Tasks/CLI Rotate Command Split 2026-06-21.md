---
title: CLI Rotate Command Split 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/refactor
  - evidence
status: done
aliases:
  - 2026-06-21 CLI rotate command split
  - CLI rotate command split
---

# CLI Rotate Command Split 2026-06-21

> [!success]
> `agentfeed rotate` orchestration을 `src/cli/index.ts`에서 `src/cli/rotate-command.ts`로 분리했다. 기존 saved-token verification, browser approval, replacement-token save, `AGENTFEED_TOKEN` refusal behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / command multiplexer 축소

## Cleanup Plan

1. 기존 rotate behavior를 focused rotate tests와 `tsc --noEmit`으로 baseline 고정한다.
2. saved credential replacement token id 확인과 browser rotation orchestration을 전용 module로 이동한다.
3. `src/cli/index.ts`는 process cwd와 output dependency만 전달하는 dispatcher로 축소한다.
4. focused tests, typecheck/build, dist CLI fake API smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `src/cli/rotate-command.ts`를 추가했다.
2. `replacementTokenIdForSavedCredentials`, `rotateViaBrowserLogin`, `runRotateCommand`를 새 module로 이동했다.
3. `src/cli/index.ts`에서 rotate 전용 imports와 orchestration을 제거했다.
4. `cmdRotate`는 `runRotateCommand(args, { cwd, printLines })` 호출만 남겼다.

## Verification Evidence

Focused tests and typecheck:

```text
npx tsc --noEmit --pretty false
npm test -- --run tests/cli-status-doctor.test.ts -t "rotate|replacement|AGENTFEED_TOKEN"
```

Result:

```text
typecheck: passed
Test Files  1 passed (1)
Tests  4 passed | 34 skipped (38)
```

Full CLI suite:

```text
npm test -- --run
```

Result:

```text
Test Files  110 passed (110)
Tests  831 passed (831)
```

Build:

```text
npm run build
```

Result:

```text
build: passed
postbuild ensure-bin-executable: passed
```

Manual dist CLI smoke with fake API:

```json
{
  "ok": true,
  "oldStatusChecks": 1,
  "newStatusChecks": 1,
  "sawReplaceTokenId": true,
  "stdoutLines": 20
}
```

Smoke assertions:

- old saved token was checked through `/v1/ingest/status` once.
- browser session creation sent `replace_token_id: token-old`.
- exchanged replacement token was validated through `/v1/ingest/status` once before save.
- stdout contained `Saved replacement token.`.
- stdout did not contain the old or new token secret.
- local credentials file was replaced with the new token and `token_id: token-new` under an explicit file credential store smoke home.

## Follow-up

> [!success]
> 후속 status command split은 [[CLI Status Command Split 2026-06-21]]에서 처리했다. 남은 구조 정리 후보는 `doctor` command extraction이다.

> [!todo]
> LSP diagnostics currently fail locally with `Transport closed`. This slice used `tsc --noEmit`, focused Vitest, build, and dist CLI smoke as replacement evidence.
