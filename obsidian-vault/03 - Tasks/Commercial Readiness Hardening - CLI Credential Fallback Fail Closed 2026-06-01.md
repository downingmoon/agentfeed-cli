---
title: CLI Credential Fallback Fail Closed
date: 2026-06-01
tags:
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/security
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# CLI Credential Fallback Fail Closed

> [!success]
> `AGENTFEED_CREDENTIAL_STORE=auto`가 OS keychain unavailable/write failure 상태에서 더 이상 조용히 `credentials.json` plaintext token 저장으로 downgrade되지 않습니다.

## 배경

병렬 CLI risk scan에서 `auto` credential store가 keychain을 사용할 수 없으면 private file fallback으로 저장하는 경로가 상용 보안 정책상 너무 조용하다고 확인했습니다.

- file storage는 `~/.agentfeed/credentials.json` `0600`으로 보호되지만 raw token이 local JSON에 남습니다.
- keychain unavailable/locked 상황은 운영 환경 보안 자세가 약화되는 순간이므로 명시적 의도 없이 fallback하면 안 됩니다.
- 기존 warning provenance는 사후 관찰은 가능했지만, accidental downgrade 자체를 막지는 못했습니다.

## 변경 사항

- `src/config/credentials.ts`
  - `auto` mode에서 keychain unavailable이면 file fallback 전에 실패합니다.
  - `auto` mode에서 keychain write가 실패해도 file fallback 전에 실패합니다.
  - break-glass fallback은 `AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1`일 때만 허용합니다.
  - 의도적 file 저장은 `AGENTFEED_CREDENTIAL_STORE=file`로 계속 가능합니다.
- `tests/config.test.ts`
  - keychain unavailable 시 silent fallback 거부를 회귀 테스트로 고정했습니다.
  - explicit env opt-in 시에만 fallback file 저장과 warning metadata가 생성되는지 고정했습니다.
  - keychain write failure도 silent fallback 없이 실패하는지 고정했습니다.
- `README.md`
  - saved credential storage policy와 break-glass env를 문서화했습니다.

## Regression contract

> [!example]
> 새 regression은 구현 전 `promise resolved ... instead of rejecting`으로 실패했고, 구현 후 통과했습니다.

계약:

- `AGENTFEED_CREDENTIAL_STORE=auto` + unavailable keychain + no `AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1` → fail closed, no credentials file.
- `AGENTFEED_CREDENTIAL_STORE=auto` + keychain write failure + no opt-in → fail closed, no credentials file.
- `AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE=1` → private credentials file fallback allowed with persisted warning.
- `AGENTFEED_CREDENTIAL_STORE=file` → explicit file storage remains supported.

## 검증 증거

> [!example] Targeted
> - `npx vitest run tests/config.test.ts -t "silent file fallback|explicitly allowed|writes fail" --run` → passed

> [!example] CLI
> - `npm test -- --run` → 20 files / 264 tests passed
> - `npm run typecheck` → passed
> - `npm run release:preflight` → passed
> - `git diff --check` → passed

> [!example] Cross-repo
> - `make test` in `agentfeed-dev` → passed
> - OpenAPI operations checked: 69
> - Client contracts checked: 66 (`cli`: 6, `frontend`: 60)
> - AgentFeed CLI tests: 264 passed
> - Frontend CI/build/audit gate passed
> - Backend pytest: 226 passed, 1 warning
> - Alembic offline migration chain generated successfully

## 관련 링크

- [[Auth & Credential Safety#2026-05-31 Native macOS keychain smoke]]
- [[Auth & Credential Safety#2026-05-31 Keychain auto fallback warning provenance]]
- [[Commercial Readiness Hardening - Settings Token Revoke Confirmation 2026-06-01]]
- [[Active Tasks]]
