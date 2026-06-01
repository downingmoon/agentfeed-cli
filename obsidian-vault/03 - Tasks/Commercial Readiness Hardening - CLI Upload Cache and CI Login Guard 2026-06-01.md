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
status: done
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
> - Affected CLI gate: `npm test -- --run tests/api-hook.test.ts tests/cli-share.test.ts tests/cli-status-doctor.test.ts tests/release-preflight.test.ts && npm run typecheck && npm run release:preflight` → 101 passed + typecheck/preflight 통과.
> - Cross-repo gate: `../agentfeed-dev/scripts/test-all.sh` → CLI 296, Frontend CI/build, Backend 268, Alembic chain 통과.



> [!bug] Verifier regression repair
> 독립 verifier가 첫 업로드에서 secret redaction이 발생한 draft를 두 번째 publish/share할 때 `privacy_scan`이 `danger`에서 `safe`로 바뀌며 hash false-positive가 나는 문제를 재현했습니다. `publishDraft()`의 pre-hash scan을 `preserveResolvedFindings: true`로 고정해, unchanged redacted draft는 같은 payload hash를 유지하고 실제 content drift만 stale로 실패하게 했습니다.
>
> - RED: `npm test -- --run tests/api-hook.test.ts --testNamePattern "unchanged uploaded draft"` → `DRAFT_UPLOAD_STALE`로 실패.
> - GREEN: `npm test -- --run tests/api-hook.test.ts --testNamePattern "unchanged uploaded draft|uploaded draft cache|already uploaded draft|cached uploaded draft review URLs" && npm run typecheck` → 6 passed + typecheck 통과.

## 남은 검증

- [x] Remote GitHub CI: `downingmoon/agentfeed-cli` CI run `26763473746` → success (`b896fe2`)

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Auth & Credential Safety#2026-06-01 CLI upload cache and CI login guard]]
- [[Integration - CLI Backend Frontend#2026-06-01 CLI upload cache and CI login guard]]
