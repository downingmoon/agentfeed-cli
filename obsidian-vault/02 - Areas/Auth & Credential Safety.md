---
title: Auth & Credential Safety
aliases:
  - AgentFeed Credential Safety
  - CLI Login Safety
status: active
tags:
  - agentfeed/auth
  - security/credentials
updated: 2026-06-04
---

# Auth & Credential Safety

## 현재 원칙

- CLI token은 URL에 노출하지 않는다.
- `agentfeed login`은 브라우저 approval session을 만들고 CLI가 terminal-side exchange를 수행한다.
- 기존 token 입력은 `--token-stdin` 또는 `--token -`만 권장한다.
- literal `agentfeed login --token <token>`은 기본 차단된다.
- 저장 전 API compatibility/token status를 확인한다.

## Credential stores

| Store | 용도 |
| --- | --- |
| `auto` | OS keychain 사용 가능 시 우선 사용 |
| macOS keychain | 기본 안전 저장소 |
| Windows DPAPI | Windows native encrypted payload |
| `file` | 명시 opt-in fallback. 운영/공유 환경에서는 주의 |
| `AGENTFEED_TOKEN` | 저장소보다 우선하는 env token. saved custom API base를 암묵 상속하지 않음 |

## Backend auth contracts

- GitHub OAuth login은 access/session cookie와 audit event를 원자적으로 처리한다.
- provider token은 불필요하게 보존하지 않는다.
- CLI auth session은 status token/hash/expiry/consumed state를 검증한다.
- ingestion token은 issue/rotate/revoke/list/status를 제공한다.
- 삭제/만료/revoke token은 즉시 upload 불가.

## Frontend auth contracts

- `/cli/authorize`는 session metadata와 approval 상태를 보여준다.
- 401/session expiry는 in-place retry/CTA로 복구한다.
- logout 실패 시 local-only signed-out illusion을 만들지 않는다.
- private/review/dashboard/settings/notifications는 auth recovery branch를 가진다.

## 검증 축

- CLI: `agentfeed doctor`, credential shape validation, browser login CI guard.
- Backend: auth/session/token tests, audit trail tests.
- Frontend: CLI authorize/recovery contract tests.
- Dev: `make smoke-oauth-contract`, `make smoke-oauth-live`.

관련: [[Integration - CLI Backend Frontend]], [[Runtime Configuration]]
