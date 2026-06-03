---
title: Commercial Readiness Hardening - Private Note Auth and OAuth Nonce Cleanup 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/backend
  - security/auth
  - obsidian/task
status: done
created: 2026-06-04
related:
  - "[[Active Tasks]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Private Note Auth and OAuth Nonce Cleanup 2026-06-04

## 목표

Frontend stale auth 상태에서 author-only note가 노출되지 않도록 private 필드 렌더링을 현재 로그인 상태와 viewer permission에 묶고, Backend GitHub OAuth state nonce 테이블이 만료 레코드로 누적되지 않도록 callback write path에서 정리한다.

> [!important] 보안 기준
> `user_note` 같은 private author field는 payload presence만으로 렌더링하면 안 된다. 현재 브라우저 auth state와 server-provided viewer edit permission이 둘 다 참일 때만 노출한다.

## 변경 요약

### Frontend

- `WorklogDetailPage`에 `canEditCurrentViewer = signedIn && Boolean(w.viewerState?.canEdit)` 가드를 추가했다.
- publish 관리 버튼, report affordance, author note 렌더링을 `canEditCurrentViewer` 기준으로 정렬했다.
- `WorklogCardA` / `WorklogCardB`도 `w.viewerState?.canEdit && w.userNote` 조건으로 방어했다.
- source contract test에 private note가 data presence 단독으로 렌더링되지 않는 invariant를 추가했다.

### Backend

- GitHub OAuth callback state nonce consume 직전에 `oauth_state_consumptions.expires_at < now` 레코드를 삭제한다.
- replay duplicate은 기존 unique/flush 경계와 fake-session duplicate guard로 계속 fail-closed 유지한다.
- nonce cleanup regression test를 추가해 `DELETE FROM oauth_state_consumptions` 실행 후 새 nonce가 저장되는 계약을 고정했다.

## 검증

> [!success] Local verification
> - Frontend: `npm test`
> - Frontend: `npm run lint`
> - Frontend: `git diff --check`
> - Backend targeted: `.venv/bin/pytest tests/test_contracts.py -k 'github_callback or oauth_state' -q` → 7 passed
> - Backend full: `uv run --locked --group dev ruff check .`
> - Backend full: `uv run --locked --group dev pytest tests` → 369 passed, 1 warning

## 남은 외부 릴리즈 블로커

> [!warning]
> 코드 레벨 검증과 별개로 hosted readiness 기본 게이트는 아직 외부 배포 상태에 의존한다. `api.agentfeed.dev` DNS/deployment와 `https://agentfeed.dev/` root stale `/login` redirect가 해소되어야 default `make commercial-readiness`가 통과할 수 있다.

## 다음 후보

- Backend abandoned CLI auth session cleanup/maintenance 경로 보강
- CLI upload lock heartbeat filesystem failure fallback 추가 점검
- Frontend hosted origin과 Backend `review_base_url` cross-validation 강화
