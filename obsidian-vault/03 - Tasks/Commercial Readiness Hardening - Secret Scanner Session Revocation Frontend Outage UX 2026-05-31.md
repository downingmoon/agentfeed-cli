---
title: Commercial Readiness Hardening - Secret Scanner Session Revocation Frontend Outage UX 2026-05-31
aliases:
  - 2026-05-31 Secret Scanner Session Revocation Outage UX
  - Secret Scanner Session Revocation Frontend Outage UX
created: 2026-05-31
tags:
  - agentfeed/readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/security
  - project/tasks
status: completed
---

# Commercial Readiness Hardening - Secret Scanner Session Revocation Frontend Outage UX 2026-05-31

> [!important] 목표
> `[[Commercial Readiness Hardening - CI Automation CSP Auth Recovery Rate Limits and Search Safety 2026-05-31]]` 이후 남은 상용화 P1/P2 후보를 추가로 닫았습니다. 이번 루프는 **CLI secret redaction/publish artifact**, **Backend browser session revocation/rate limit coverage**, **Frontend auth outage UX/search dedup/CSP fallback**에 집중했습니다.

## 감사 근거

- Codex subagents가 CLI/Backend/Frontend를 병렬 읽기 전용 감사했습니다.
- Gemini에게도 3개 레포 상용화 관점 P1/P2 후보를 요청했고, privacy scanner 및 credential/token hardening 계열 리스크를 재확인했습니다.

## 구현 요약

### CLI

- `src/privacy/scan.ts` secret 패턴 보강
  - npm token, Slack token, PEM private key block, `*_KEY` / `*_SECRET` / `*_PASSWORD` / `*_TOKEN` 류 assignment redaction 추가
  - assignment는 설정 이름은 보존하고 값만 `[REDACTED_SECRET]`로 치환
- `src/auth/browser-login.ts`
  - browser login polling sleep을 남은 timeout으로 cap
  - timeout 시 pending error 대신 명시적 `authorization timed out` 메시지 반환
- `src/cli/index.ts`
  - CI/headless 환경에서는 `--open-review` 명시 없이는 project config의 auto-open을 무시
- `package.json` / `scripts/ensure-bin-executable.mjs`
  - `postbuild`에서 npm bin target `dist/cli/index.js`를 `0755`로 고정
  - `npm pack --dry-run --ignore-scripts --json`으로 tarball mode `493` 확인

### Backend

- `users.session_revoked_at` 추가 + Alembic `012_user_session_revocation`
- JWT 발급 시 `iat` / `iat_ms` claim 추가
- `/v1/auth/logout`이 cookie 삭제뿐 아니라 현재 user의 browser session cutoff를 갱신
- `get_current_user_optional()`이 `session_revoked_at` 이전에 발급된 browser JWT를 거부
- rate-limit coverage 보강
  - `GET /v1/me/ingestion-tokens`
  - `GET /v1/users/{username}/activity`
  - `GET /v1/users/{username}/projects/{project_slug}`
  - `GET /v1/worklogs/{id}/review`
  - `GET /v1/integrations/{integration_type}/setup-guide`
- dynamic path normalization에 integration setup-guide placeholder 추가

### Frontend

- Review protected route에서 `authError`일 때 무한 “로그인 상태 확인 중” 대신 outage 안내와 Retry CTA 표시
- Header sign-in/get-started button이 `authError` 동안 disabled/title 처리되어 무반응 버튼을 제거
- CSP builder가 malformed runtime API URL에서 middleware throw 대신 localhost safe fallback으로 CSP 생성
- Search load-more merge가 worklog/user/project/prompt stable key 기준으로 dedup 처리

> [!warning] 남은 리스크
> OS Keychain 기반 CLI token 저장은 새 dependency/플랫폼 설계가 필요한 별도 P1 후보로 남겼습니다. 현재 파일 저장은 `0600` 권한으로 보호하지만, 상용 보안 레벨을 더 올리려면 후속 설계가 필요합니다.

## 검증 결과

> [!success] Gate 통과
> 3개 레포 개별 gate와 통합 `agentfeed-dev make test`가 통과했습니다.

- CLI: `npm run build && test -x dist/cli/index.js && npm run typecheck && npm test -- --run` → 217 passed
- CLI package: `npm pack --dry-run --ignore-scripts --json` → `dist/cli/index.js` mode `493` (`0755`) 확인
- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Backend: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 162 passed, 1 known Starlette deprecation warning
- Integration: `make test` in `agentfeed-dev` → passed; includes CLI prepack, frontend production build, backend ruff/pytest, Alembic offline migration chain through `012_user_session_revocation`
- Diff hygiene: `git diff --check` across CLI/Frontend/Backend → passed

## 관련 링크

- [[Active Tasks]]
- [[Privacy Safety]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - CI Automation CSP Auth Recovery Rate Limits and Search Safety 2026-05-31]]

## 원격 반영

> [!success] Push 완료
> 2026-05-31 현재 상용화 hardening 변경분을 3개 레포 원격 브랜치에 반영했습니다.

- CLI: `downingmoon/agentfeed-cli@eae3ea0` → `main`
- Frontend: `downingmoon/agentfeed-frontend@0210468` → `main`
- Backend: `downingmoon/agentfeed-backend@4471e79` → `master`

검증 기준은 위 [[#검증 결과]]의 `agentfeed-dev make test` 통합 gate입니다.
