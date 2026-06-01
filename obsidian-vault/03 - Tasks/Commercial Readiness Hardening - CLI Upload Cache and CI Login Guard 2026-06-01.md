---
title: Commercial Readiness Hardening - CLI Upload Cache and CI Login Guard 2026-06-01
aliases:
  - CLI stale upload cache guard
  - CLI CI browser login guard
  - AgentFeed CLI cached review safety

tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/privacy
  - agentfeed/auth
status: in-progress
created: 2026-06-01
repositories:
  - AgentFeed-CLI
---

# Commercial Readiness Hardening - CLI Upload Cache and CI Login Guard 2026-06-01

## 목표

> [!abstract]
> CLI가 이미 업로드된 draft를 재사용할 때 local privacy redaction 이후 payload drift를 조용히 숨기지 않도록 fail-closed하고, CI 환경에서는 `AGENTFEED_TOKEN` 존재 여부와 무관하게 browser login session 생성을 기본 차단합니다.

## 변경 계약

### Cached private review safety

- `publishDraft()`는 local draft public fields를 다시 scan/redact한 뒤 sanitized ingest payload hash를 계산합니다.
- 성공 업로드 metadata에는 `payload_hash`를 저장합니다.
- 이미 업로드된 draft는 saved `payload_hash`가 현재 redacted payload hash와 같을 때만 cached review URL을 재사용합니다.
- Hash가 없거나 다르면 `DRAFT_UPLOAD_STALE`로 실패하고 network upload를 시도하지 않습니다.
- 실패 시 local redaction은 저장해 사용자가 secret을 다시 노출하지 않도록 합니다.

### CI browser login safety

- `AGENTFEED_CI`, `CI`, `GITHUB_ACTIONS` 등 CI indicator가 truthy면 `agentfeed login` browser flow는 기본 차단됩니다.
- 이 차단은 `AGENTFEED_TOKEN`이 이미 설정된 CI에서도 유지됩니다.
- CI에서는 login 대신 existing `AGENTFEED_TOKEN`으로 non-login commands를 실행하거나 `login --token-stdin`을 사용해야 합니다.
- 의도적으로 browser auth를 테스트하는 경우에만 `--browser`/`allowCiBrowser` override를 사용합니다.

## 구현 파일

- `src/api/client.ts`
- `src/auth/browser-login.ts`
- `src/types.ts`
- `tests/api-hook.test.ts`
- `tests/cli-share.test.ts`
- `tests/cli-status-doctor.test.ts`

## 검증 증거

> [!success] RED → GREEN
> - RED: `npm test -- --run tests/api-hook.test.ts --testNamePattern "uploaded draft cache"`가 `draftUploadPayloadHash is not a function`으로 실패.
> - GREEN: `npm test -- --run tests/api-hook.test.ts --testNamePattern "uploaded draft cache|already uploaded draft|cached uploaded draft review URLs"` → 5 passed.
> - Affected share/auth gate: `npm test -- --run tests/api-hook.test.ts tests/cli-share.test.ts && npm run typecheck` → 75 passed + typecheck 통과.
> - RED: `npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts --testNamePattern "environment token|already present"`가 CI + `AGENTFEED_TOKEN` browser session request로 실패.
> - GREEN: `npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts --testNamePattern "environment token|already present|token remediation" && npm run typecheck` → 6 passed + typecheck 통과.
> - CLI full gate: `npm test -- --run && npm run typecheck && npm run release:preflight` → 295 passed + typecheck/preflight 통과.
> - Cross-repo gate: `../agentfeed-dev/scripts/test-all.sh` → CLI 295, Frontend CI/build, Backend 267, Alembic chain 통과.

## 남은 검증

- [ ] Remote GitHub CI

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Auth & Credential Safety#2026-06-01 CLI upload cache and CI login guard]]
- [[Integration - CLI Backend Frontend#2026-06-01 CLI upload cache and CI login guard]]
