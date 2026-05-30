---
title: Auth & Credential Safety
aliases:
  - AgentFeed Credential Safety
  - CLI Login Safety
tags:
  - agentfeed/auth
  - agentfeed/cli
  - security/credentials
status: active
created: 2026-05-30
---

# Auth & Credential Safety

> [!abstract] 목적
> AgentFeed CLI가 브라우저 로그인과 token login을 제공하되, 사용자가 원할 때 로컬 credential 파일을 남기지 않는 안전한 경로를 보장합니다.

## 2026-05-30 CLI ephemeral login --no-save

> [!success]
> `agentfeed login --no-save`와 `agentfeed login --token <token> --no-save`는 `~/.agentfeed/credentials.json`을 생성하지 않습니다.

### 계약

- 기본 로그인은 기존처럼 credential file에 저장합니다.
- `--no-save`가 있으면 현재 명령 안에서 credential object만 구성하고 저장하지 않습니다.
- 브라우저 로그인도 approval/token exchange는 수행하지만, token을 파일이나 URL에 노출하지 않습니다.
- `--no-save` 이후의 다른 명령은 저장 credential을 기대하지 않고 `AGENTFEED_TOKEN` 또는 다시 저장 로그인해야 합니다.

### 구현 포인트

- `credentialsFromToken()`은 `resolveApiBaseUrl()` 검증/정규화를 재사용해 ephemeral credential을 만듭니다.
- `saveCredentials()`는 같은 helper를 사용해 기존 저장 동작과 필드 구성을 공유합니다.
- `browserLogin({ save: false })`는 CLI auth session exchange 후 `credentialsFromToken()`만 호출합니다.
- `cmdLogin`은 `--no-save`를 token login과 browser login 모두에 전달합니다.

### 검증

- RED 확인: `npx vitest run tests/config.test.ts tests/api-hook.test.ts`가 ephemeral helper 누락과 browser login 저장 문제로 실패
- GREEN 확인: `npx vitest run tests/config.test.ts tests/api-hook.test.ts`
- 전체 CLI gate:
  - `npm run typecheck`
  - `npm test -- --run`
  - `npm run build`
- `../agentfeed-dev/scripts/test-all.sh`
- 실제 CLI smoke:
  - `HOME=$(mktemp -d) node dist/cli/index.js login --token af_live_ephemeral --api-base-url http://localhost:8001/v1 --no-save`
  - `~/.agentfeed/credentials.json` 미생성 확인
  - 저장 로그인 후 `agentfeed status`가 `User/token: configured`를 표시하는지 확인

> [!warning]
> `--no-save`는 token을 출력하지 않습니다. 보안상 브라우저 교환 결과 token을 터미널에 노출하지 않으며, ephemeral 사용이 필요하면 `AGENTFEED_TOKEN` 환경변수를 사용합니다.

## 2026-05-30 GitHub OAuth state CSRF protection

> [!success]
> Backend GitHub OAuth login은 이제 signed state와 HttpOnly cookie를 함께 검증한 뒤에만 GitHub token exchange를 진행합니다.

### 계약

- `/v1/auth/github`는 매 요청마다 random nonce를 포함한 state를 생성합니다.
- state payload는 Backend `SECRET_KEY` 기반 HMAC으로 서명합니다.
- 같은 state 값을 `agentfeed_oauth_state` HttpOnly cookie에도 저장합니다.
- `/v1/auth/github/callback`은 query `state`와 cookie state가 일치하고 signature가 유효한 경우에만 `next` path를 복원합니다.
- state 검증 실패 시 GitHub code/token exchange를 시작하지 않습니다.
- callback 성공 후 OAuth state cookie는 삭제합니다.

### 검증

- RED: invalid state callback 테스트가 기존 구현에서 GitHub token exchange를 먼저 호출해 실패
- GREEN:
  - `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'oauth_state or github_login_sets or invalid_oauth_state'`
  - `uv run --with pytest --with pytest-asyncio pytest -q`
  - `uv run --with ruff ruff check --select I,F app/routers/auth.py tests/test_contracts.py`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

> [!warning]
> 이 변경은 배포 중 이미 시작된 GitHub OAuth redirect에는 영향을 줄 수 있습니다. 새 login 시작부터는 state cookie가 발급되므로 정상 동작합니다.

## 2026-05-30 Deleted user ingestion-token invalidation

> [!success]
> Soft-deleted user는 JWT/cookie 인증뿐 아니라 `af_live_...` ingestion token 인증에서도 즉시 거부됩니다.

### 계약

- Backend `get_ingestion_user()`는 ingestion token row가 유효하더라도 소유 user가 active(`users.deleted_at IS NULL`)인 경우에만 인증을 허용합니다.
- user가 삭제되었거나 active 조회에서 누락되면 `IngestionTokenInvalid`를 반환합니다.
- token의 `last_used_at`은 active user 확인 이후에만 갱신합니다.
- 따라서 soft-delete된 계정의 미회수 token은 이후 CLI upload/preflight에서 성공하지 않습니다.

### 검증

- RED: soft-deleted user 시뮬레이션에서 기존 구현이 `last_used_at`을 먼저 갱신해 실패
- GREEN:
  - `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k ingestion_token`
  - `uv run --with pytest --with pytest-asyncio pytest -q`
  - `uv run --with ruff ruff check --select I,F app/dependencies.py tests/test_contracts.py`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

> [!important]
> 계정 삭제/비활성화 정책을 바꿀 때는 JWT 경로(`get_current_user_optional`)와 ingestion-token 경로(`get_ingestion_user`)의 active-user filter가 계속 같아야 합니다.

## 2026-05-30 CLI auth exchange active-user gate

> [!success]
> 브라우저 승인 후 CLI가 token을 교환하는 마지막 단계에서도 user active 상태를 다시 확인합니다.

### 문제

- 승인 시점에는 `get_current_user`가 active user만 허용합니다.
- 하지만 승인 직후부터 CLI exchange 직전 사이에 user가 soft-delete되면, 기존 exchange 경로는 `db.get(User, id)`만 사용해 새 ingestion token을 발급할 수 있었습니다.
- 이는 [[#2026-05-30 Deleted user ingestion-token invalidation]]의 사후 사용 차단과 별개로, 삭제된 계정에 새 token을 만들 수 있는 gap입니다.

### 계약

- `POST /v1/auth/cli/sessions/{session_id}/exchange`는 `users.deleted_at IS NULL` 조건으로 user를 다시 조회합니다.
- active user가 아니면 `UNAUTHORIZED`로 실패합니다.
- 실패 시 session status는 `approved`로 남고, `consumed_at`을 설정하지 않으며, 새 `IngestionToken`을 추가하지 않습니다.
- active user일 때만 raw `af_live_...` token이 생성되고 session이 `consumed`로 전환됩니다.

### 검증

- RED: exchange가 `db.get(User, id)`로 deleted user에게 token을 발급해 실패
- GREEN:
  - `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'cli_auth_exchange'`
  - `uv run --with pytest --with pytest-asyncio pytest -q`
  - `uv run --with ruff ruff check --select I,F app/routers/auth.py tests/test_contracts.py`
- 통합 gate:
  - `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 CLI credential file permissions

> [!success]
> 저장 로그인으로 생성되는 `~/.agentfeed` 디렉터리와 `credentials.json` 파일을 private POSIX mode로 고정했습니다.

### 문제

- `saveCredentials()`가 일반 `ensureDir()` / `writeJson()`을 사용하면 디렉터리가 사용자 umask에 따라 `0755`처럼 group/world-readable이 될 수 있습니다.
- 파일은 사후 `chmod(0600)`이 있었지만, 생성 순간의 default permission과 상위 디렉터리 공개 permission이 token 저장소 관점에서 약했습니다.

### 계약

- `~/.agentfeed`는 저장 로그인 시 `0700`으로 생성/보정합니다.
- `~/.agentfeed/credentials.json`은 `0600`으로 생성/보정합니다.
- POSIX permission이 없는 filesystem에서는 best-effort로 실패를 삼키되, 기본 저장 경로는 private-by-default를 유지합니다.

### 검증

- RED: `npx vitest run tests/config.test.ts --testNamePattern 'private POSIX'`가 기존 `0755` directory mode로 실패
- GREEN:
  - `npx vitest run tests/config.test.ts --testNamePattern 'private POSIX'`
  - `npm test -- --run tests/config.test.ts tests/version.test.ts`
  - `npm run typecheck`
  - `npm pack --dry-run`
  - `../agentfeed-dev/scripts/test-all.sh`

> [!important]
> token 저장소 관련 변경은 [[Integration - CLI Backend Frontend#2026-05-30 CLI npm prepack release gate|release packaging gate]]와 함께 검증해, npm 배포 tarball이 최신 credential storage 코드를 포함하도록 유지합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-30 CLI ephemeral login --no-save]]
- [[Integration - CLI Backend Frontend#2026-05-30 GitHub OAuth state CSRF protection]]
- [[Integration - CLI Backend Frontend#2026-05-30 Deleted user ingestion-token invalidation]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI auth exchange active-user gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI login/token smoke 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI npm prepack release gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 CLI credential file permissions]]
- [[Privacy Safety]]
- [[Active Tasks#P1 후보]]

## 2026-05-30 OAuth state payload expiry

> [!success]
> GitHub OAuth state는 cookie lifetime에만 의존하지 않고 signed payload 내부 만료 시간도 검증합니다.

보안 계약:

- state payload에는 `next`, random `nonce`, `exp`가 포함됩니다.
- query state와 HttpOnly cookie state는 byte-for-byte 일치해야 합니다.
- HMAC signature가 유효해야 합니다.
- `exp`가 없거나 현재 시각보다 과거이면 `OAUTH_STATE_INVALID`로 실패합니다.

관련 구현: [[Integration - CLI Backend Frontend#2026-05-30 OAuth state payload expiry]]
