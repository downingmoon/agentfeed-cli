---
title: Commercial Readiness Hardening - Smoke User Note Privacy Contract 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/devops
  - agentfeed/privacy
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - Smoke User Note Privacy Contract 2026-05-31

## 목적

`agentfeed-dev`의 `make smoke-e2e`가 현재 privacy contract를 잘못 검증하지 않도록 수정했습니다. `user_note`는 owner review context에는 남지만 public detail/feed payload에는 노출되지 않아야 합니다.

## 발견한 문제

> [!bug]
> 기존 smoke script는 publish 이후 public detail/feed payload에서 `Smoke author note`가 노출되는 것을 기대했습니다. 현재 Backend/Frontend 상용 privacy contract는 이 값이 public surface에서 제거되는 것입니다.

근거:

- Backend public worklog card/detail은 `user_note: None`을 반환합니다.
- Backend review API는 owner context로 `worklog.user_note`를 유지하되 `preview.public_fields`에서 제외합니다.
- Frontend public adapter는 API 응답에 `user_note`가 있어도 public `Worklog.userNote`로 노출하지 않습니다.

## 변경 사항

- `agentfeed-dev/scripts/smoke-e2e.sh`
  - review API 단계에서는 `worklog.user_note == "Smoke author note"`를 유지 검증합니다.
  - public detail/feed 단계에서는 `user_note is None`과 serialized payload에 `Smoke author note`가 없는 것을 검증합니다.
- `agentfeed-dev/README.md`
  - smoke가 owner-only `user_note` privacy boundary까지 확인한다고 명시했습니다.
- `[[Integration - CLI Backend Frontend]]`
  - 2026-05-30 user_note 공개 메모 계약을 2026-05-31 owner-only review context 계약으로 superseded 처리했습니다.

## 검증 증거

- `bash -n ../agentfeed-dev/scripts/smoke-e2e.sh` → passed
- `make smoke-e2e` in `../agentfeed-dev` → passed after auth session, privacy block/resolve, publish/feed verification

## 남은 리스크

> [!success]
> Docker dev stack running 상태에서 `make smoke-e2e`까지 통과했습니다. 추가 보강 범위는 [[Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31]]에 기록했습니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-05-31 Smoke user_note privacy contract]]
- [[Privacy Safety#2026-05-31 Smoke user_note privacy contract]]
- [[Active Tasks#P1 후보]]
