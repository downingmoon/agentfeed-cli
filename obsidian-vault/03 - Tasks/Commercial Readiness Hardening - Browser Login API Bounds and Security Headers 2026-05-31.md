---
title: Browser Login API Bounds and Security Headers Hardening 2026-05-31
aliases:
  - 2026-05-31 browser login API bounds security headers
  - Commercial readiness browser login hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/ultrawork
  - security/auth
  - security/runtime
  - backend/contracts
status: done
created: 2026-05-31
---

# Browser Login API Bounds and Security Headers Hardening 2026-05-31

> [!success] 결과
> CLI onboarding hang, Frontend API error/runtime hardening, Backend visibility/status/input bound 리스크를 한 루프로 닫았습니다.

## 변경 요약

- [[AgentFeed CLI MOC|CLI]]
  - `openBrowser()`가 browser opener process에 영구 대기하지 않고 timeout으로 빠져나옵니다.
  - `agentfeed login`은 opener 실행 전에 authorize URL을 먼저 출력해 Linux/WSL/kiosk opener hang에도 수동 복구가 가능합니다.
  - `agentfeed publish --json`을 추가해 automation에서 upload 결과를 안정적으로 파싱할 수 있습니다.
  - `publish`도 `share`와 동일하게 review URL clipboard copy를 시도하고 `--no-clipboard`를 지원합니다.

- [[Integration - CLI Backend Frontend|Frontend]]
  - `apiFetch()`가 HTTP 200 + HTML/empty/malformed body를 raw `SyntaxError` 대신 safe `ApiError`로 변환합니다.
  - 401 API 응답은 `agentfeed:auth-error` event를 발생시키고 AppContext가 signed-out 상태로 정리합니다.
  - security headers를 `src/lib/security-headers.ts`로 계약화하고 HSTS, Permissions-Policy, COOP/CORP 등을 추가했습니다.

- [[Runtime Configuration|Backend API]]
  - MVP에서 구현되지 않은 `team` visibility를 request schema에서 제거했습니다.
  - Project/worklog visibility와 worklog status에 DB check constraint를 추가했습니다.
  - username/profile/project/worklog/ingest payload의 DB column 길이와 enum 경계를 Pydantic schema에서 먼저 검증합니다.
  - list/search/tags pagination limit에 `ge=1` lower bound와 direct-call clamp를 추가했습니다.

## 닫은 리스크

> [!warning] 기존 리스크
> 일부 상용화 edge case는 테스트 green이어도 실제 사용자 환경에서 onboarding hang, malformed API body crash, DB-level invalid enum 저장으로 이어질 수 있었습니다.

- Browser opener가 종료하지 않는 환경에서 `agentfeed login`이 URL도 출력하지 못한 채 멈출 수 있던 문제
- Frontend가 성공 status의 non-JSON response에서 raw parse error로 깨지는 문제
- expired cookie 이후 action/API 호출에서 앱 auth state가 stale하게 남는 문제
- Backend가 schema에서는 `team`을 허용하지만 runtime은 fail-closed로만 처리하던 visibility contract drift
- DB column보다 넓은 string/list/metric 입력이 422 대신 500/DB error로 이어질 수 있는 문제

## 검증

- CLI targeted: `npm test -- --run tests/open-browser.test.ts tests/cli-share.test.ts` → passed
- CLI full: `npm run typecheck && npm test -- --run` → 192 passed
- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Backend targeted: `PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q tests/test_contracts.py` → 143 passed
- Backend full: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 156 passed
- Alembic offline: `uv run alembic upgrade head --sql` → includes `010_follow_no_self_constraint -> 011_visibility_status_constraints`

## 관련 링크

- [[Auth & Credential Safety#2026-05-31 Browser login opener timeout]]
- [[Runtime Configuration#2026-05-31 Frontend API response and security header hardening]]
- [[Runtime Configuration#2026-05-31 Backend request bounds and visibility constraints]]
- [[Integration - CLI Backend Frontend#2026-05-31 Browser login API bounds security headers]]
- [[Active Tasks#2026-05-31 P1 hardening continuation]]
