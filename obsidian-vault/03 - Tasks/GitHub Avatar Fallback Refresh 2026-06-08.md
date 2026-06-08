---
title: GitHub Avatar Fallback Refresh 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - contracts
  - avatar
  - completed
status: completed
---

# GitHub Avatar Fallback Refresh 2026-06-08

## 목적

사용자 게시글(feed), 댓글, 알림, 검색, 프로젝트 owner, leaderboard 등 user identity surface에서 GitHub profile image가 최대한 일관되게 보이도록 보완했다.

## 발견

> [!bug]
> 신규 GitHub 로그인 사용자는 backend `avatar_url`이 저장되지만, 기존 GitHub provider 계정으로 재로그인하는 사용자는 최신 `avatar_url`이 갱신되지 않았다.

> [!warning]
> Frontend는 `avatar_url`이 비어 있고 `github_url`만 있는 PublicUser/AuthMe payload를 받으면 GitHub profile image를 표시하지 못하고 gradient initials fallback만 렌더링했다.

## 수정

- [[agentfeed-backend]]
  - `app/services/auth.py`
    - 기존 provider 계정 재사용 경로에서 GitHub `avatar_url`과 `github_url`을 최신 OAuth payload 기준으로 refresh한다.
    - provider token 비저장 정책은 유지한다.
- [[agentfeed-frontend]]
  - `src/lib/adapters.ts`
    - `avatar_url`이 없고 신뢰 가능한 `https://github.com/:username` URL이 있을 때 `https://github.com/:username.png?size=96` fallback을 생성한다.
    - non-GitHub URL이나 nested path는 avatar fallback으로 쓰지 않는다.
    - GitHub handle 표시도 trusted GitHub profile URL만 사용하도록 정리했다.

## RED → GREEN 증거

- RED
  - `npm run test:contracts` 실패: `adaptUser must derive a GitHub profile image fallback from a trusted github_url when avatar_url is missing`
  - `.venv/bin/pytest -q tests/test_contracts.py::test_github_login_reuses_active_provider_account_without_persisting_provider_tokens` 실패: 기존 user `avatar_url`이 `None`
- GREEN
  - `npm run test:contracts` ✅
  - `npm run lint` ✅
  - `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_REVIEW_BASE_URL=http://localhost:3000 npm run build` ✅
  - `.venv/bin/ruff check .` ✅
  - `.venv/bin/pytest -q` ✅ — 398 passed, 1 warning

## Surface 재확인

정적 스캔 기준 `src/components` 아래 user/feed identity surface 중 `adaptUser`, `getWorklogAuthor`, `ownerUser`, `currentUser`, `notification.actor`, `prompt.author`, `rising_builders` 등을 쓰면서 `Avatar`를 전혀 쓰지 않는 컴포넌트는 발견되지 않았다.

## 후행 과제

> [!todo]
> 실제 개인서버 데이터에서 오래된 사용자 row의 `avatar_url`이 비어 있을 수 있다. 서버/DB 작업은 현재 goal 규칙상 보류하므로, 추후 배포 단계에서 재로그인 또는 안전한 backfill 정책을 별도 검토한다.

> [!todo]
> Backend public discovery에서 username 없는 user가 profile/follow entry surface에 노출되는지 별도 계약 점검을 이어간다. 이전 루프의 profile-link guard와 연결되는 후속 품질 항목이다.
