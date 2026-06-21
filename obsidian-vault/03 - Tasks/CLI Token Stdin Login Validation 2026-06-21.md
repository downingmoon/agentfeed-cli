---
title: CLI Token Stdin Login Validation 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/contract
  - evidence
status: done
aliases:
  - 2026-06-21 CLI token stdin login validation
  - CLI token stdin login validation
---

# CLI Token Stdin Login Validation 2026-06-21

> [!success]
> `agentfeed login --token-stdin`과 browser login이 같은 ingestion-token validity gate를 사용하게 했다. 이제 stdin token login도 credentials 저장 전 `/ingest/status`에서 invalid/revoked token을 fail-closed 처리한다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 계약 초점: login token input path와 publish preflight token contract 정렬

## Root Cause

직전 browser login hardening은 browser exchange token만 저장 전 `/ingest/status`로 검증했다. 하지만 `agentfeed login --token-stdin` 경로는 API compatibility만 확인한 뒤 token을 저장했다. 이 경로에서는 invalid/revoked ingestion token이 login 성공처럼 저장되고, 이후 `publish`에서야 `INGESTION_TOKEN_INVALID`가 드러날 수 있었다.

## Actions

1. `src/auth/login-token-validation.ts`를 추가해 login token validity check를 공용화했다.
2. `src/auth/browser-login.ts`의 browser exchange token 검증을 공용 validator로 이동했다.
3. `src/cli/index.ts`의 token/stdin login 경로가 저장 전 `requireValidLoginTokenBeforeCredentialSave`를 호출하게 했다.
4. `tests/cli-status-doctor.test.ts`에 invalid token-stdin regression을 추가하고, 기존 token-stdin 성공 fixture가 `/ingest/status`를 통과하도록 갱신했다.
5. 이전 follow-up 문서 [[CLI macOS Login Token Validation 2026-06-21]]의 token-stdin TODO를 완료로 업데이트했다.

## Verification Evidence

```text
npm test -- --run tests/cli-status-doctor.test.ts -t "invalid"
```

Result:

```text
RED before implementation: invalid token-stdin login resolved instead of rejecting.
GREEN after implementation: invalid token-stdin login rejects before credentials file creation.
```

Focused regression suite:

```text
npm test -- --run tests/cli-status-doctor.test.ts tests/api-hook.test.ts tests/keychain-env.test.ts
```

Result:

```text
Test Files  3 passed (3)
Tests  174 passed (174)
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

Static checks:

```text
npm run typecheck
npm run build
git diff --check
```

Result: passed.

Manual dist CLI QA against a fake API:

```json
{
  "badExit": 1,
  "badMentionsInvalid": true,
  "badMentionsBeforeSaving": true,
  "badLeaksToken": false,
  "badFileMissing": true,
  "goodExit": 0,
  "goodSavedToken": true,
  "goodLeaksToken": false,
  "statusChecks": 2
}
```

## Follow-up

> [!todo]
> Push/deploy policy conflict remains unresolved: goal says “5 commits then Push & deploy” and also “서버 배포 금지”. Current safe interpretation remains local commits only; do not deploy server until the user resolves the conflict.
