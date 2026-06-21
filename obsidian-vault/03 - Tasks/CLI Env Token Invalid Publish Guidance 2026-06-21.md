---
title: CLI Env Token Invalid Publish Guidance 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/contract
  - evidence
status: done
aliases:
  - 2026-06-21 CLI AGENTFEED_TOKEN invalid publish guidance
  - CLI env token invalid publish guidance
---

# CLI Env Token Invalid Publish Guidance 2026-06-21

> [!bug]
> 사용자가 macOS에서 최신 CLI로 재로그인 후 `publish`를 실행했지만 `/v1/ingest/status`가 `INGESTION_TOKEN_INVALID`를 반환한다고 보고했다. 코드 확인 결과 `AGENTFEED_TOKEN` 환경변수가 있으면 새로 저장한 로그인 토큰보다 우선하므로, stale/revoked env token이 계속 publish preflight에 사용될 수 있었다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 계약 초점: CLI upload preflight recovery guidance

## Root Cause

`loadCredentialsWithMetadata`는 `AGENTFEED_TOKEN`이 설정되어 있으면 저장된 keychain/file credential보다 환경변수 토큰을 우선한다. 이 정책은 안전하지만, 기존 오류 안내가 `agentfeed login`을 먼저 제시해 사용자가 새 토큰을 저장해도 publish가 계속 stale env token을 쓰는 상황을 설명하지 못했다.

## Actions

1. `src/cli/upload-guidance.ts`에서 ingestion token preflight가 `401/403`을 받고 `AGENTFEED_TOKEN`이 설정되어 있으면 recovery command 첫 항목으로 `unset AGENTFEED_TOKEN`을 제시하도록 변경했다.
2. `tests/upload-preflight.test.ts`에 env-token 실패 전용 회귀 테스트를 추가했다.
3. `tests/cli-share.test.ts`의 share/publish invalid-token UX 기대값을 새 recovery order로 갱신했다.

## Verification Evidence

```text
npm run build
npm test -- --run tests/upload-preflight.test.ts tests/cli-share.test.ts
npm run typecheck
```

Result:

```text
Test Files  2 passed (2)
Tests       61 passed (61)
tsc --noEmit passed
```

> [!note]
> 첫 targeted test 실행은 `cli-share` `beforeAll` 빌드가 Vitest hook timeout 10s에 걸려 실패했다. `npm run build`를 먼저 실행한 뒤 동일 테스트를 재실행해 통과했다.

## User Workaround

macOS/다른 PC에서 같은 오류가 나면 먼저 현재 shell의 env token을 제거하고 저장된 로그인 토큰을 쓰게 한다.

```bash
unset AGENTFEED_TOKEN
export AGENTFEED_ALLOW_INSECURE_API=1
export AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1
agentfeed status
agentfeed publish --id <draft-id> --yes
```

새로 로그인해야 하면:

```bash
unset AGENTFEED_TOKEN
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_CREDENTIAL_STORE=file \
agentfeed login
```

## Follow-up

> [!todo]
> 이번 변경은 CLI UX/diagnostic 보강이다. 현재 개발서버에는 배포하지 않았다. 사용자가 서버 배포를 명시 요청하기 전까지 server-test 배포는 보류한다.

> [!todo]
> 추후 release/preflight 문서에서 `AGENTFEED_TOKEN`이 저장 credential보다 우선한다는 설명을 더 눈에 띄게 배치할지 검토한다.

## 2026-06-21 16:18 UTC — Saved token API-base override warning

> [!bug]
> 추가 확인: `unset AGENTFEED_TOKEN -> agentfeed login -> agentfeed publish` 후에도 `INGESTION_TOKEN_INVALID`가 날 수 있다. `echo "$AGENTFEED_TOKEN"`이 빈 것은 정상이다. CLI 로그인은 부모 shell env를 설정하지 않고, 토큰을 keychain/file credential store에 저장한다.

### Additional Root Cause

저장 credential에는 토큰을 발급받은 `api_base_url`이 남지만, publish 실행 시 `AGENTFEED_API_BASE_URL`이 설정되어 있으면 저장 credential의 API host보다 환경변수 API host가 우선한다. 이때 저장 토큰이 다른 host에서 발급된 것이면 `/v1/ingest/status`는 `401 INGESTION_TOKEN_INVALID`를 반환한다.

### Additional Action

- `src/config/credentials.ts`에서 저장 토큰의 saved API base와 현재 `AGENTFEED_API_BASE_URL`이 다른 경우 warning을 생성한다.
- `tests/config.test.ts`에 saved-token API host override 회귀 테스트를 추가했다.

### Correct Diagnostic Sequence

```bash
unset AGENTFEED_TOKEN
export AGENTFEED_ALLOW_INSECURE_API=1
export AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1
agentfeed status
agentfeed doctor
```

`status`/`doctor`에서 saved token host mismatch warning이 보이면, 같은 API base로 다시 로그인한다.

```bash
unset AGENTFEED_TOKEN
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_CREDENTIAL_STORE=file \
agentfeed login
```

## 2026-06-21 16:34 UTC — Publish preflight status-first recovery

> [!success]
> `/v1/ingest/status`가 `401/403`이고 `AGENTFEED_API_BASE_URL`이 설정된 경우, publish/share recovery가 `agentfeed login`보다 `agentfeed status`를 먼저 제시하게 했다. saved-token API host mismatch warning은 `status`에서 노출되므로, 사용자가 같은 로그인 반복으로 빠지는 루프를 줄인다.

### Additional Action

- `src/cli/upload-guidance.ts`에서 env token이 없고 env API base만 있는 401/403 recovery 순서를 `agentfeed status -> agentfeed login -> agentfeed rotate`로 조정했다.
- `tests/upload-preflight.test.ts`에 API-base env override 의심 상황에서 status-first recovery를 보장하는 회귀 테스트를 추가했다.

### Verification

```text
npm test -- --run tests/upload-preflight.test.ts tests/config.test.ts
npm run typecheck
```
