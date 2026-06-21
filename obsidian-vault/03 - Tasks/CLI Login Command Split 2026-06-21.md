---
title: CLI Login Command Split 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/refactor
  - evidence
status: done
aliases:
  - 2026-06-21 CLI login command split
  - CLI login command split
---

# CLI Login Command Split 2026-06-21

> [!success]
> `agentfeed login` orchestration을 `src/cli/index.ts`에서 `src/cli/login-command.ts`로 분리했다. 직전 browser/token-stdin credential-save validation 계약은 유지하면서, login token input·browser login·credential save·JSON/human output 책임이 전용 command module에 모였다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / command multiplexer 축소

## Cleanup Plan

1. 기존 login behavior를 `tests/cli-status-doctor.test.ts -t "login"`로 baseline 고정한다.
2. `cmdLogin` 내부 orchestration과 stdin reader를 새 `login-command` module로 이동한다.
3. `src/cli/index.ts`는 process cwd/env/print dependency만 전달하는 dispatcher로 축소한다.
4. focused login tests, auth/keychain regression, full CLI suite, typecheck/build, dist CLI smoke로 회귀를 확인한다.

## Actions

1. `src/cli/login-command.ts`를 추가했다.
2. `runLoginCommand(args, io)`가 token stdin/browser login/save/no-save/json/human output을 소유하게 했다.
3. `src/cli/index.ts`에서 login 전용 imports와 stdin reader를 제거했다.
4. `cmdLogin`은 `runLoginCommand` 호출만 남겼다.

## Verification Evidence

Baseline before extraction:

```text
npm test -- --run tests/cli-status-doctor.test.ts -t "login"
```

Result:

```text
Test Files  1 passed (1)
Tests  14 passed | 24 skipped (38)
```

Focused post-extraction checks:

```text
npm test -- --run tests/cli-status-doctor.test.ts -t "login"
npm test -- --run tests/cli-status-doctor.test.ts tests/api-hook.test.ts tests/keychain-env.test.ts
npm run typecheck
```

Result:

```text
login focused: 1 file passed, 14 tests passed
focused regression: 3 files passed, 174 tests passed
typecheck: passed
```

Full suite/build:

```text
npm run build
npm test -- --run
```

Result:

```text
build: passed
Test Files  110 passed (110)
Tests  831 passed (831)
```

Manual dist CLI smoke with fake API:

```json
{
  "exit": 0,
  "saved": true,
  "stdoutLeaksToken": false,
  "stderrLeaksToken": false,
  "savedToken": true,
  "metadataChecks": 1,
  "statusChecks": 1
}
```

## Follow-up

> [!success]
> 후속 rotate command split은 [[CLI Rotate Command Split 2026-06-21]]에서 처리했다. 남은 구조 정리 후보는 status/doctor 같은 diagnostic command cluster다.

> [!todo]
> LSP diagnostics는 local LSP transport가 `Transport closed`로 실패해 `tsc --noEmit`, focused/full Vitest, build, dist CLI smoke를 대체 evidence로 사용했다.
