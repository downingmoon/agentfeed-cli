---
title: Commercial Readiness Hardening - CLI Upload Lock Heartbeat Failure 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - reliability/locking
  - obsidian/task
status: done
created: 2026-06-04
related:
  - "[[Active Tasks]]"
  - "[[Commercial Readiness Hardening - CLI Auth Session Expiry Cleanup 2026-06-04]]"
---

# Commercial Readiness Hardening - CLI Upload Lock Heartbeat Failure 2026-06-04

## 목표

CLI `share`/`publish`가 draft upload lock을 획득한 뒤 filesystem heartbeat를 갱신하지 못하는 상황을 조용히 무시하지 않도록 fail-closed 처리한다.

> [!important] Lock invariant
> Upload lock heartbeat 실패는 lock 소유권이 불확실해졌다는 신호다. 이 상태에서는 서버 upload가 이미 진행됐더라도 local draft upload metadata를 저장하지 않고, 같은 명령 재실행으로 duplicate reconcile하도록 유도해야 한다.

## 변경 요약

- `startDraftUploadLockHeartbeat()`가 `utimes()` 실패를 숨기지 않고 내부 failure state로 기록하도록 변경했다.
- `publishDraftWithLock()`는 draft write와 upload metadata 저장 전 heartbeat health를 확인한다.
- heartbeat 실패 시 `DRAFT_UPLOAD_LOCK_HEARTBEAT_FAILED` / HTTP-like `423` 에러를 반환한다.
- 테스트 전용/운영 튜닝용 `AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS`를 추가해 heartbeat failure regression을 빠르게 재현할 수 있게 했다.
- lock release는 기존대로 token hash가 일치할 때만 lock file을 삭제하므로 replacement lock 삭제 위험은 늘리지 않았다.

## 검증

> [!success] Local verification
> - Targeted: `npm test -- --run tests/api-hook.test.ts` → 87 passed
> - Full tests: `npm test -- --run` → 395 passed
> - Typecheck: `npm run typecheck`
> - Build: `npm run build`

## 남은 외부 릴리즈 블로커

> [!warning]
> Hosted strict readiness는 여전히 코드 변경과 별개로 `api.agentfeed.dev` DNS 및 `https://agentfeed.dev/` root stale `/login` redirect 해소가 필요하다.
