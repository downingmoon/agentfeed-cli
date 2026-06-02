---
title: Commercial Readiness Hardening - CLI Concurrent Publish Serialization 2026-06-02
aliases:
  - CLI concurrent publish serialization
  - Draft upload lock hardening
  - Same draft duplicate upload prevention
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/collection
  - agentfeed/integration
  - agentfeed/reliability
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - CLI Concurrent Publish Serialization 2026-06-02

> [!success] 목표
> 같은 local draft에 대해 `agentfeed publish` / `agentfeed share` upload path가 동시에 실행되어도 private review draft가 중복 업로드되지 않도록 per-draft serialization을 보장합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P2 후보]]
- 수집 시스템 영역: [[Collection System#2026-06-02 CLI concurrent publish serialization]]
- 통합 영역: [[Integration - CLI Backend Frontend#2026-06-02 CLI concurrent publish serialization]]
- 병렬 audit 근거: CLI sidecar audit가 P1은 없다고 판단했고, 가장 강한 P2 후보로 same-draft concurrent publish duplication을 제시했습니다.

## 발견한 gap

기존 `publishDraft()`는 다음 순서로 동작했습니다.

1. draft JSON read
2. `draft.upload.uploaded` 확인
3. upload POST
4. updated upload metadata write

두 CLI process 또는 같은 process의 두 publish call이 1~2단계를 동시에 통과하면 둘 다 `/v1/ingest/worklogs`를 호출할 수 있었습니다. Backend idempotency가 일부 보호하더라도 local metadata last-writer-wins와 duplicate review artifact/retry noise가 생길 수 있는 운영 신뢰성 리스크입니다.

## 변경 범위

- `AgentFeed-CLI/src/api/client.ts`
  - `publishDraft()` 전체 read/redact/upload/write critical section을 per-draft lock으로 감쌉니다.
  - lock path는 draft JSON 옆의 `<draft>.json.upload.lock`입니다.
  - lock acquisition은 `open('wx')` 방식이라 cross-process에서도 exclusive create가 됩니다.
  - lock holder는 완료 후 handle close + lock ownership token 확인 후 자기 lock file만 제거합니다.
  - stale lock은 5분 이상 지난 경우 제거합니다.
  - lock wait는 기본 60초이며 `AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS`로 조정 가능합니다.
- `AgentFeed-CLI/tests/api-hook.test.ts`
  - 같은 draft에 대해 `Promise.all([publishDraft, publishDraft])`를 실행해 ingest fetch가 1회만 발생해야 하는 regression을 추가했습니다.

## 고정된 계약

- 같은 draft id의 upload critical section은 직렬화됩니다.
- 첫 호출이 upload metadata를 저장한 뒤, 두 번째 호출은 draft를 다시 읽고 cached review result를 재사용합니다.
- lock은 draft list에 노출되지 않는 `.upload.lock` suffix를 사용합니다.
- stale lock recovery는 bounded이며 active lock을 정상 경로에서 삭제하지 않습니다.
- lock release는 token ownership을 확인해 replacement lock을 삭제하지 않습니다.
- 기존 cached upload payload hash revalidation과 review URL trust policy는 lock 내부에서 그대로 유지됩니다.

## 검증 증거

- RED: `npm test -- --run tests/api-hook.test.ts -t 'serializes concurrent publishes'`
  - 실패 원인: `expected "vi.fn()" to be called 1 times, but got 2 times`.
- GREEN: `npm test -- --run tests/api-hook.test.ts -t 'draft upload lock|serializes concurrent publishes'`
  - 2 tests passed: same-draft concurrent publish serialization, held-lock timeout without upload.
- GREEN: `npm test -- --run && npm run typecheck && npm run release:preflight && npm audit --audit-level=high`
  - CLI: 21 files / 323 tests passed.
  - Typecheck passed.
  - Release preflight passed.
  - Dependency audit found 0 vulnerabilities.
- GREEN: `../agentfeed-dev ./scripts/test-all.sh`
  - OpenAPI contract gate passed: 70 operations, CLI 6 contracts, frontend 61 contracts.
  - CLI: 323 tests passed, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff passed, 285 pytest passed, alembic offline migration chain generated through `019_audit_events`.

## 남은 리스크

> [!warning]
> 이번 테스트는 same-process concurrency를 고정하고 구현은 cross-process lock file로 확장했습니다. 실제 두 shell process가 같은 draft를 동시에 publish하는 live smoke는 별도 manual/CLI integration candidate로 남길 수 있습니다.

다음 P2 후보:

- Frontend Settings profile/username two-step save partial-success recovery.
