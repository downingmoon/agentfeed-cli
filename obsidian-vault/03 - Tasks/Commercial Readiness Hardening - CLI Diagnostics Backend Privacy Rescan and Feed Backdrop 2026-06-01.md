---
title: Commercial Readiness Hardening - CLI Diagnostics Backend Privacy Rescan and Feed Backdrop 2026-06-01
aliases:
  - CLI version diagnostics and resilient local metadata
  - Backend publish-time client scan rescan
  - Feed filter semantic backdrop
  - 2026-06-01 CLI backend frontend hardening loop
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/privacy
  - agentfeed/accessibility
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - CLI Diagnostics Backend Privacy Rescan and Feed Backdrop 2026-06-01

> [!abstract] 목적
> 공개 npm CLI, publish-time privacy gate, public feed accessibility에서 발견된 작은 failure mode를 상용 운영 기준으로 bounded하게 만듭니다.

## 수정한 gap

### CLI package diagnostics and local metadata resilience

- `agentfeed --version` / `agentfeed -v`가 `package.json` 버전을 그대로 출력합니다.
- `agentfeed --help`가 설치된 CLI version을 표시합니다.
- release preflight가 built CLI의 `--help`와 `--version` smoke를 모두 검증합니다.
- `agentfeed status`는 malformed `.claude/settings.json` 때문에 crash하지 않고 hook status를 `unknown`으로 표시하며 warning을 출력합니다.
- malformed `.agentfeed/state.json`은 collection/share cursor를 차단하지 않고 default window로 복구합니다.
- malformed `.agentfeed/config.json`은 raw JSON parser error 대신 복구 안내가 포함된 명시 오류로 실패합니다.

### Backend publish-time privacy trust boundary

- ingest client가 보낸 `privacy_scan` JSON은 `source: client`로 저장됩니다.
- public/unlisted publish gate는 `source: server_publish_fallback`인 scan만 terminal trusted scan으로 취급합니다.
- client가 `status: safe`, `findings: []`를 보내도 publish 직전에 server fallback scan을 다시 수행해 public prompt/title/summary/outcome/tags의 secret/private URL pattern을 차단합니다.

### Frontend feed filter backdrop semantics

- Feed filter popover의 full-screen backdrop을 click-only `div`에서 named `<button type="button" aria-label="Close filter menu">`로 바꿨습니다.
- 기존 click-to-close 동작은 유지하고 keyboard/assistive-tech 관점에서 semantic interactive control로 고정했습니다.

## 검증 증거

- CLI targeted: `npm test -- --run tests/cli-status-doctor.test.ts tests/cli-collect.test.ts tests/release-preflight.test.ts` → passed, 28 tests
- CLI typecheck: `npm run typecheck` → passed
- CLI release gate: `npm run release:preflight` → passed, built `agentfeed --help` and `--version` validated
- Backend targeted: `uv run --locked --group dev pytest tests/test_contracts.py -q -k 'privacy_scan or publish_runs_server_privacy_scan or publish_records_safe_server_privacy_scan or ingested_preresolved_critical'` → passed, 5 tests
- Frontend contracts/typecheck: `npm run test:contracts && npm run lint && git diff --check` → passed

## 남은 후보

> [!todo]
> Frontend CLI authorization page는 `session_id` URL 노출 축소와 pending/session retry loop가 다음 상용화 후보입니다. 이 변경은 OAuth roundtrip state 설계가 필요하므로 별도 작업으로 분리합니다.

## 연결

- [[Collection System]]
- [[Privacy Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
- [[Active Tasks]]
