---
title: Commercial Readiness Hardening - Settings Review Cookie and Command Wrapper Safety 2026-06-01
aliases:
  - Settings review cookie command-wrapper hardening
  - 2026-06-01 settings review auth cookie CLI safety
tags:
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - Settings Review Cookie and Command Wrapper Safety 2026-06-01

> [!abstract] 목적
> 상용화 직전 critical path에서 실패가 조용히 묻히거나, 인증 쿠키가 브라우저에 남거나, CLI 설정 명령이 shell 실행으로 우회되는 문제를 차단했습니다.

## 수정 요약

- [[Integration - CLI Backend Frontend#2026-06-01 Settings review cookie and command wrapper safety|Frontend/Backend/CLI 통합 계약]]
  - Settings 저장을 privacy/notification 독립 mutation으로 분리해 한쪽 실패가 다른 쪽 성공 결과를 덮지 않게 했습니다.
  - Worklog review publish/resolve 실패 메시지와 pending 상태를 assistive technology가 인지할 수 있게 `role="alert"`와 `aria-busy` 계약으로 고정했습니다.
- [[Auth & Credential Safety#2026-06-01 Auth cookie teardown security tuple parity|Backend auth cookie teardown parity]]
  - GitHub OAuth state cookie와 browser session cookie의 set/delete가 같은 `HttpOnly`, `Secure`, `SameSite=lax`, `path=/` tuple을 사용하도록 공통 helper로 정렬했습니다.
- [[Collection System#2026-06-01 Configured command wrapper shell bypass|CLI configured command wrapper bypass 차단]]
  - `.agentfeed/config.json` configured command가 `env`, `command` wrapper 뒤에 `bash -c`/`sh -c`를 숨겨 shell 실행 제한을 우회하지 못하게 했습니다.

## TDD 기록

> [!failure] RED
> - Frontend: `npm run test:contracts`가 `settings save must isolate independent privacy and notification mutation failures` 계약에서 실패했습니다.
> - Backend: `uv run pytest tests/test_contracts.py -q -k 'github_callback_sets_api_wide_session_cookie_and_clears_state or logout_clears_session_cookie'`가 OAuth state delete/logout delete cookie의 `HttpOnly` 누락으로 실패했습니다.
> - CLI: `npx vitest run tests/git-draft.test.ts --testNamePattern 'shell-interpreter configured commands'`가 wrapper 뒤 shell command를 resolve해 실패했습니다.

> [!success] GREEN
> - Frontend: Settings partial save, auth recovery, Worklog review alert/busy contract를 source contract로 고정했습니다.
> - Backend: `_browser_auth_cookie_options()` helper로 set/delete 속성을 일원화했습니다.
> - CLI: wrapper-aware command validator가 `env bash -c`, `env -u PATH bash -c`, `env -S ...`, `command sh -c`를 거부합니다.

## 커밋

- Frontend: `1124d8a` — `Let critical settings and review actions recover accessibly`
- Backend: `dda5018` — `Keep browser auth cookie teardown attribute-matched`
- CLI: `eabb9eb` — `Reject shell interpreters hidden behind command wrappers`

## 검증 증거

- Frontend
  - `npm run test:contracts`
  - `npm run lint`
  - `npm run ci`
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check`
- Backend
  - `uv run pytest tests/test_contracts.py -q -k 'github_callback_sets_api_wide_session_cookie_and_clears_state or logout_clears_session_cookie'` → `2 passed, 230 deselected`
  - `uv run ruff check app/routers/auth.py tests/test_contracts.py`
  - `uv run pytest -q` → `246 passed, 1 warning`
  - `git diff --check`
- CLI
  - `npx vitest run tests/git-draft.test.ts --testNamePattern 'shell-interpreter configured commands'` → `2 passed | 16 skipped`
  - `npm run typecheck`
  - `npm test -- --run` → `269 tests passed`
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check`
- Cross-repo
  - `make test` in `agentfeed-dev`
  - OpenAPI contract gate: 69 operations / 66 client contracts / 3 backend-only ops
  - Frontend CI, Backend ruff/pytest/Alembic offline chain, CLI typecheck/tests/release preflight/audit 통과

## 남은 리스크

> [!warning]
> CLI sidecar가 찾은 두 번째 gap은 아직 다음 slice 후보로 남아 있습니다. `--clipboard` / `--open-review` output handoff 실패가 JSON/non-JSON flow에서 deterministic하게 surface되는지 추가 보강해야 합니다.

> [!warning]
> 실제 GitHub OAuth 브라우저 왕복은 credential이 필요한 live smoke이므로, 현재 변경은 contract/test 기준으로 검증했습니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Settings review cookie and command wrapper safety]]
- [[Auth & Credential Safety#2026-06-01 Auth cookie teardown security tuple parity]]
- [[Collection System#2026-06-01 Configured command wrapper shell bypass]]
- [[Active Tasks#P1 후보]]
