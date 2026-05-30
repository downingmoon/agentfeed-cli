---
title: Auth Validation Pagination CSP and CSRF Contract 2026-05-31
aliases:
  - 2026-05-31 auth validation pagination CSP CSRF contract
  - Commercial readiness auth response pagination CSP hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/ultrawork
  - security/auth
  - security/privacy
  - frontend/pagination
  - frontend/csp
  - backend/contracts
status: done
created: 2026-05-31
---

# Auth Validation Pagination CSP and CSRF Contract 2026-05-31

> [!success] 결과
> CLI auth 저장 경계, privacy scanner, Frontend feed/comment pagination, CSP/error boundary, Backend CSRF bearer+cookie 계약을 한 루프로 보강했습니다.

## 변경 요약

- [[AgentFeed CLI MOC|CLI]]
  - CLI browser auth exchange와 token rotation의 HTTP 200 응답을 저장 전에 runtime validation합니다.
  - malformed token, invalid `token_expires_at`, unsafe `user` shape는 `API_RESPONSE_INVALID`로 실패하고 기존 credentials를 덮어쓰지 않습니다.
  - `AGENTFEED_CI=1` 환경에서 browser login은 `AGENTFEED_TOKEN` 또는 `agentfeed login --token` 안내와 함께 빠르게 실패합니다. 의도적으로 browser auth를 돌릴 때는 `--browser`를 사용합니다.
  - Discord bot token-like secret을 high severity로 redaction합니다.

- [[Integration - CLI Backend Frontend|Frontend]]
  - `/feed`가 backend cursor pagination을 사용하고 `Load more`로 다음 페이지를 append합니다.
  - Worklog detail comments도 `next_cursor` / `has_more`를 보존하고 `Load more comments`로 append합니다.
  - `Content-Security-Policy`를 frame-only에서 `default-src`, `base-uri`, `object-src`, `connect-src`, `img-src`, `font-src`, `style-src`, `script-src`, `form-action` 중심의 의미 있는 directive 계약으로 확장했습니다.
  - `src/app/error.tsx`, `src/app/global-error.tsx`를 추가해 production client/render failure에 branded recovery UI를 제공합니다.

- [[Runtime Configuration|Backend API]]
  - CSRF origin check가 Bearer-only API client는 허용하되, browser cookie가 함께 있는 mutation은 Authorization header가 있어도 trusted Origin/Referer를 요구하는 계약을 테스트로 고정했습니다.

## 닫은 리스크

> [!warning] 기존 리스크
> Auth endpoint가 200 malformed body를 주면 credentials overwrite로 이어질 수 있고, public feed/comment는 첫 페이지만 보여 commercial discovery가 잘려 보일 수 있었습니다. CSP도 frame-ancestor만 있어 실제 XSS/embedding surface 축소가 약했습니다.

- malformed auth exchange/rotate response로 credential file이 깨질 수 있는 문제
- CI에서 browser login이 interactive open/polling을 시작하는 문제
- Discord bot token-like secret 누락 문제
- Feed/comments 첫 페이지만 노출하는 discovery/engagement truncation 문제
- CSP가 frame-only라 script/style/connect/object/base policy를 검증하지 않던 문제
- route/global render error가 Next default error로만 보이던 문제
- Bearer + cookie mutation이 CSRF origin gate를 우회하지 않는다는 계약 부재

## 검증

- CLI: `npm run typecheck && npm test -- --run` → 205 passed
- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Backend: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 159 passed
- Integration: `agentfeed-dev make test` → passed (CLI test/typecheck/prepack/audit, Frontend contract/audit/build, Backend ruff/pytest/Alembic offline)

## 관련 링크

- [[Auth & Credential Safety#2026-05-31 Auth response validation and CI browser guard]]
- [[Privacy Safety#2026-05-31 Discord token redaction]]
- [[Runtime Configuration#2026-05-31 CSP and CSRF contract hardening]]
- [[Integration - CLI Backend Frontend#2026-05-31 Feed comments pagination and runtime recovery]]
- [[Active Tasks#2026-05-31 auth validation pagination CSP continuation]]
