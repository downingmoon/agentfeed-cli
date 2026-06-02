---
title: Commercial Readiness Hardening - Dashboard Saved DOM Smoke 2026-06-02
aliases:
  - Dashboard saved DOM smoke
  - Saved worklogs browser smoke
  - Authenticated dashboard saved smoke
tags:
  - agentfeed/commercial-readiness
  - agentfeed/dev-smoke
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/social
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - Dashboard Saved DOM Smoke 2026-06-02

> [!success] 목표
> Dashboard가 `/v1/me/bookmarks`를 실제 signed-in 브라우저 화면에서 소비하고, 저장된 worklog와 `Following author` viewer-state badge를 hydrated DOM으로 렌더링하는지 dev live smoke에 고정합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P1 후보]]
- 통합 기준: [[Integration - CLI Backend Frontend#2026-06-02 dashboard saved DOM smoke]]
- 선행 UI surface: [[Commercial Readiness Hardening - Dashboard Saved Bookmarks Surface 2026-06-02]]
- 선행 API viewer-state 계약: [[Commercial Readiness Hardening - Bookmark Follow State Contract 2026-06-02]]

## 변경 범위

- `agentfeed-dev/scripts/smoke-e2e.sh`
  - dev DB에 smoke viewer와 별도 followed author를 생성.
  - public saved worklog, `Bookmark`, `Follow` 관계를 seed.
  - authenticated browser cookie로 `/dashboard`를 열고 `Saved worklogs`, saved worklog title, `Following author` 문구를 hydrated DOM에서 검증.
  - CLI browser auth/rotation approval smoke가 Backend가 발급한 `user_code`를 브라우저 input에 입력한 뒤 승인하도록 정렬.
- `agentfeed-dev/scripts/browser-dom-dump.mjs`
  - `--fill-selector` / `--fill-value`를 지원해 headless Chrome CDP에서 click 전 input을 채움.
- `agentfeed-dev/scripts/test-all.sh`
  - saved-dashboard DOM smoke marker와 CLI approval code fill marker를 static gate로 고정.

## 고정된 계약

- Saved/bookmarked dashboard surface는 API/adapter/source contract만으로 충분하지 않고, authenticated hydrated DOM에서 확인되어야 합니다.
- `/dashboard` smoke fixture는 self-author가 아닌 followed author를 사용해 `viewer_state.following_author` badge를 실제 조건으로 검증해야 합니다.
- CLI authorize page는 terminal-only approval code를 URL에 노출하지 않으므로, browser smoke는 code가 화면에 보이는지 기대하지 않고 input에 직접 입력해야 합니다.

## 검증 증거

- RED: `./scripts/test-all.sh` 실패.
  - 실패 원인: `scripts/smoke-e2e.sh`에 `AUTH_DASHBOARD_SAVED_DOM_FILE`, `Saved worklogs`, `Following author`, `SMOKE_SAVED_WORKLOG_ID` marker가 없었음.
- 발견/보정: live smoke가 CLI authorize 승인 구간에서 중단됨.
  - 원인: Backend/Frontend가 `user_code` 입력을 요구하지만 기존 `browser-dom-dump.mjs`는 click만 지원하고 input fill을 지원하지 않았음.
  - 보정: `--fill-selector 'input[placeholder="123-456"]' --fill-value "$CLI_AUTH_USER_CODE"` / rotation code fill 추가.
- GREEN: `bash -n scripts/smoke-e2e.sh && bash -n scripts/test-all.sh && node --check scripts/browser-dom-dump.mjs` 통과.
- GREEN: `./scripts/smoke-e2e.sh` 통과.
  - Verified CLI publish → review API → frontend route → publish → feed for `dd2c1c4a-97b0-46e3-8142-23c5b6cb8d8a`.
  - CLI browser-login approval, token replacement approval, authenticated dashboard saved DOM, logout revocation smoke passed.
- GREEN: `./scripts/test-all.sh` 통과.
  - AgentFeed OpenAPI contract gate passed.
  - CLI: 21 test files / 314 tests passed, typecheck passed, release preflight passed, dependency audit found 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, dependency audit passed.
  - Backend: ruff passed, 284 tests passed, Alembic offline migration chain generated through `019_audit_events`.

## 남은 리스크

> [!warning]
> Live smoke는 로컬 Docker stack, Chrome headless binary, dev OAuth env에 의존합니다. GitHub Actions 원격 CI는 이 full live browser path를 그대로 실행하지 않으므로, 원격에서는 static/contract gates가 회귀 방지의 주된 수단입니다.
