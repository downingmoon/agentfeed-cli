---
title: CLI macOS Login Token Validation 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/macos
  - agentfeed/contract
  - evidence
status: done
aliases:
  - 2026-06-21 CLI macOS login token validation
  - CLI macOS login token validation
---

# CLI macOS Login Token Validation 2026-06-21

> [!success]
> `agentfeed login` 성공 직후 `agentfeed publish`가 `INGESTION_TOKEN_INVALID`로 실패할 수 있는 경로를 login 단계에서 차단했다. macOS Keychain 저장은 실제 `security add-generic-password -w <password>` 호출 형태에 맞춰 수정했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 계약 초점: CLI login credential persistence 및 exchanged ingestion token validity

## User-Visible Diagnosis

- `unset AGENTFEED_TOKEN -> agentfeed login -> echo "$AGENTFEED_TOKEN"` 결과가 빈 값인 것은 정상이다. CLI child process는 parent shell의 environment를 export할 수 없고, AgentFeed CLI는 login 토큰을 OS keychain 또는 private credentials file에 저장한다.
- 반대로 `login`이 성공했다고 출력된 뒤 `publish` preflight가 `HTTP 401: INGESTION_TOKEN_INVALID`로 실패하는 것은 정상 성공 플로우가 아니다. login이 저장/반환하기 전에 exchanged ingestion token을 `/ingest/status`로 검증해야 한다.

## Root Cause

1. `src/auth/browser-login.ts`는 browser auth exchange 응답의 token을 받은 뒤 API compatibility만 확인하고, token 자체가 ingest API에서 유효한지 검증하지 않았다.
2. `src/config/credentials.ts`의 macOS keychain writer가 `security add-generic-password ... -w`를 token 인자 없이 실행하고 stdin으로 token을 전달했다. macOS `security`는 이 형태에서 `password data for new item:` 프롬프트를 띄울 수 있어 non-interactive CLI 저장이 timeout/failure로 이어진다.

## Actions

1. Browser login exchange 직후 `checkIngestionToken(credentials)`를 실행하게 했다.
2. Token check 실패 시 credentials 저장 전 `Ingestion token check failed ... before saving credentials`로 중단한다.
3. macOS keychain 저장 호출을 `security add-generic-password ... -w <token>` 형태로 변경했다.
4. Regression tests:
   - invalid exchange token은 credentials file을 만들지 않고 login을 실패시킨다.
   - macOS `security` helper는 `-w` 뒤 password argument를 받는다.

## Verification Evidence

```text
npm test -- --run tests/keychain-env.test.ts tests/api-hook.test.ts tests/upload-preflight.test.ts tests/cli-status-doctor.test.ts
npm run typecheck
npm run build
npm test -- --run
```

Result:

```text
Focused regression: 4 test files passed, 181 tests passed.
tsc --noEmit passed.
tsc build passed.
Full CLI suite: 110 test files passed, 830 tests passed.
```

## Notes

> [!note]
> macOS `security` CLI의 non-interactive 저장 제약 때문에 token은 `security` process argv로 전달된다. Shell은 사용하지 않고 helper environment는 계속 scrub한다. 실제 장기 저장 위치는 OS Keychain이다.

> [!todo]
> `agentfeed login --token-stdin` 경로도 browser login과 같은 `/ingest/status` 선검증을 공유하도록 후속 정리할 수 있다.
