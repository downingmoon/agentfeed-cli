---
title: Commercial Readiness Hardening - Hydrated Browser Privacy Smoke 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/devops
  - agentfeed/privacy
  - agentfeed/frontend
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - Hydrated Browser Privacy Smoke 2026-05-31

## 목적

이전 smoke는 API payload와 static route shell까지는 검증했지만, 실제 브라우저에서 React hydration 이후 public detail/feed가 owner-only `user_note`를 렌더링하지 않는지는 직접 확인하지 못했습니다.

> [!important]
> 상용화 privacy gate는 API 계약뿐 아니라 사용자가 보는 hydrated DOM에서도 같은 결과여야 합니다.

## 변경 사항

- `agentfeed-dev/scripts/browser-dom-dump.mjs`
  - 로컬 Chrome/Chromium을 headless DevTools mode로 실행합니다.
  - CDP로 target을 생성하고 route load 후 DOM이 기대 문자열을 포함할 때까지 polling합니다.
  - Playwright 같은 새 npm dependency 없이 browser-level smoke를 수행합니다.
- `agentfeed-dev/scripts/smoke-e2e.sh`
  - public publish 후 `/worklogs/{id}`와 `/feed?agent=cursor&time_range=week&limit=20`를 실제 headless browser로 렌더링합니다.
  - Detail DOM은 dynamic title과 `cursor-agent` model badge를 positive assertion으로 확인합니다.
  - Feed DOM은 dynamic title과 `Cursor` agent label을 positive assertion으로 확인합니다.
  - 두 DOM 모두 `Smoke author note` / `Note: Smoke author note`가 없는지 negative assertion합니다.
- `agentfeed-dev/scripts/test-all.sh`
  - `node --check scripts/browser-dom-dump.mjs`를 추가해 helper syntax를 cross-repo gate에 포함했습니다.
- `agentfeed-dev/README.md`
  - smoke에 hydrated browser DOM privacy check가 포함되고, `CHROME_BIN` override를 사용할 수 있음을 명시했습니다.

## 검증 증거

- `bash -n scripts/smoke-e2e.sh` → passed
- `node --check scripts/browser-dom-dump.mjs` → passed
- `make smoke-e2e` → passed
- `make test` → passed (`AgentFeed-CLI` 232 tests, frontend contract/build, backend 199 tests, Alembic offline chain)

## 남은 리스크

> [!warning]
> 이 smoke는 local Chrome/Chromium이 필요합니다. CI에서 실행하려면 runner image에 Chrome/Chromium을 설치하거나 `CHROME_BIN`을 지정해야 합니다.

## 관련 링크

- [[Privacy Safety#2026-05-31 Hydrated browser privacy smoke]]
- [[Integration - CLI Backend Frontend#2026-05-31 Hydrated browser public DOM smoke]]
- [[Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31]]
- [[Active Tasks#P1 후보]]
