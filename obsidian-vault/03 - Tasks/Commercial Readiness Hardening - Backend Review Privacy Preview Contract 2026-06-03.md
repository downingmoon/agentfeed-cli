---
title: Commercial Readiness Hardening - Backend Review Privacy Preview Contract 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/privacy
  - agentfeed/review
status: done
created: 2026-06-03
---

# Backend Review Privacy Preview Contract

## 목표

Review 화면의 `safe_public_preview`가 publish gate와 다른 판단을 내려, 사용자가 안전하다고 보이는 draft를 publish 시점에야 차단당하는 계약 drift를 줄였습니다.

## 변경

- `agentfeed-backend/app/routers/worklogs.py`
  - `PrivacyFinding` response payload 생성을 `_privacy_finding_payload()`로 통합
  - GET `/v1/worklogs/{id}/review`에서 기존 unresolved blocking finding이 없으면 publish gate와 같은 `_server_privacy_scan()` 실행
  - server fallback scan이 blocking finding을 만들면 실제 `PrivacyFinding` row를 저장하고 `privacy_scan_json`을 갱신
  - 생성된 finding ID가 review response에 내려가므로 Frontend `resolveFinding()` UX와 연결 가능
  - `preview.safe_public_preview`를 unresolved blocking 여부에 맞춰 `false`로 설정

## 검증

> [!success]
> Review API와 publish gate의 privacy fallback scan 계약을 같은 test surface에서 검증했습니다.

- `uv run --locked --group dev ruff check app/routers/worklogs.py tests/test_contracts.py` — 통과
- `uv run --locked --group dev pytest tests/test_contracts.py -q -k 'worklog_review or publish_server_privacy_scan or publish_rescans_client_safe_privacy_scan'` — 7 passed
- `uv run --locked --group dev pytest -q` — 334 passed, 1 warning
- `../agentfeed-dev ./scripts/test-all.sh` — 통과
- `git diff --check` — 통과

## 남은 리스크

- GET review가 server fallback finding을 생성하는 쓰기 side effect를 갖습니다. 사용자가 publish 전에 실제 finding을 resolve할 수 있어야 하므로 의도된 tradeoff입니다.
- 외부 hosted readiness blocker(`api.agentfeed.dev` DNS, `agentfeed.dev/` `/login` redirect)는 별도 작업입니다.

## 관련

- [[Commercial Readiness Hardening - Frontend Hosted Readiness Preflight 2026-06-03]]
- [[Active Tasks]]
- [[Privacy Safety]]
