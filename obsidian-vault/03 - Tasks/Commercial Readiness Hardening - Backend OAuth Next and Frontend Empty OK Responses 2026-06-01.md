---
title: Commercial Readiness Hardening - Backend OAuth Next and Frontend Empty OK Responses 2026-06-01
aliases:
  - OAuth Next Backend Allowlist
  - Empty OK Response Frontend Fallback
  - OAuth Next and Empty OK Response Hardening
tags:
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Backend OAuth Next and Frontend Empty OK Responses 2026-06-01

## 목적

GitHub OAuth return path와 successful mutation response parsing을 상용 운영 경계에 맞게 보강했습니다.

> [!important]
> Frontend `authNextPath()`만 신뢰하면 Backend `/v1/auth/github?next=...`를 직접 호출하는 경로가 남습니다. OAuth state에 서명하기 전 Backend도 allowlist/query-key/hash 정책을 적용해야 합니다.

> [!note]
> 반대로 Frontend API client는 delete/logout/report/read-all 같은 `{ ok: true }` mutation이 204/empty body로 돌아와도 성공 UX를 유지해야 하지만, 데이터가 필요한 JSON endpoint의 malformed/empty success는 계속 실패해야 합니다.

## 수정 요약

### Backend OAuth next trust boundary

- `app/routers/auth.py`의 `_safe_next_path()`를 slash-prefix check에서 in-app path allowlist로 강화했습니다.
- 허용 path/query 계약을 Backend에 명시했습니다.
  - exact: `/`, `/feed`, `/explore`, `/leaderboard`, `/projects`, `/search`, `/dashboard`, `/notifications`, `/settings`, `/docs`, `/privacy`, `/terms`, `/changelog`, `/cli/authorize`
  - prefix: `/profile/`, `/projects/`, `/worklog/`, `/worklogs/`
  - `/cli/authorize`는 `session_id`만 보존합니다.
- unknown route, protocol-relative path, backslash, encoded slash/backslash, dot segment, whitespace/control, scheme-like path를 `/dashboard`로 수렴시켰습니다.
- `access_token`, `id_token`, `token`, `oauth_token`, `oauth_verifier`, `code`, `state` 류 OAuth-sensitive query/hash 값은 redirect state에서 제거합니다.

### Frontend empty success response fallback

- `apiFetch()`에 `allowEmptyBody` + `emptyBodyValue`를 내부 옵션으로 추가했습니다.
- fallback은 명시적으로 `{ data: { ok: true } }`가 stable client contract인 call site에만 적용했습니다.
  - `auth.logout`
  - `worklogs.delete`
  - `projects.delete`
  - `me.revokeIngestionToken`
  - `me.markAllNotificationsRead`
  - `social.reportWorklog`
  - `social.reportComment`
- `social.like` 같은 JSON data-dependent endpoint는 empty 2xx를 계속 `ApiError(502)`로 처리합니다.

## TDD 기록

> [!bug] RED - Backend
> OAuth next state regression을 먼저 추가했고, 기존 구현은 unsafe/unknown path와 token-bearing query/hash를 그대로 signed state에 보존해 14개 케이스가 실패했습니다.

> [!success] GREEN - Backend
> Backend allowlist/query/hash sanitizer를 추가한 뒤 targeted OAuth state 테스트 20개가 통과했습니다.

> [!bug] RED - Frontend
> `{ ok: true }` mutation의 empty 204 response regression을 먼저 추가했고, 기존 `parseApiJson()`이 `Empty API response from 204`로 실패했습니다.

> [!success] GREEN - Frontend
> Empty body fallback을 explicit OK endpoints에만 적용했고, non-allowlisted JSON endpoint empty 200 rejection regression도 함께 고정했습니다.

## 검증 증거

- Backend targeted:
  - `uv run pytest tests/test_contracts.py -q -k 'oauth_next_state or oauth_state or github_login_sets_cookie'` → `20 passed, 211 deselected`
- Backend full:
  - `uv run ruff check app/routers/auth.py tests/test_contracts.py` → passed
  - `uv run pytest -q` → `245 passed, 1 warning`
- Frontend targeted/full:
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `npm run ci` → typecheck, contract tests, production build passed
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check` → clean
- Cross-repo gate:
  - `agentfeed-dev make test` → OpenAPI contract gate, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain passed

## 커밋

- Backend: `cb727e1` — `Constrain OAuth return paths at the backend trust boundary`
- Frontend: `2595329` — `Tolerate empty success only for explicit OK endpoints`

## 남은 리스크

> [!warning]
> 실제 GitHub OAuth credential을 사용하는 browser round-trip은 이번 변경에서 재실행하지 않았습니다. `/cli/authorize?session_id=...` 계약은 state encode/decode와 cross-repo tests로 검증했습니다.

> [!note]
> 실제 proxy가 204/empty body를 반환하는 환경은 로컬 mock contract로 검증했습니다. 현재 Backend는 여전히 `OkResponse` JSON을 반환합니다.

## 관련 링크

- [[Auth & Credential Safety#2026-06-01 Backend OAuth next allowlist]]
- [[Integration - CLI Backend Frontend#2026-06-01 Backend OAuth next and Frontend empty OK responses]]
- [[Active Tasks#P1 후보]]
