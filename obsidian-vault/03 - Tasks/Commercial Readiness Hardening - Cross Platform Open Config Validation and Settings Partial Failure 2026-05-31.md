---
title: Commercial Readiness Hardening - Cross Platform Open Config Validation and Settings Partial Failure 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - hardening
status: done
created: 2026-05-31
related:
  - "[[Auth & Credential Safety]]"
  - "[[Runtime Configuration]]"
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# Commercial Readiness Hardening - Cross Platform Open Config Validation and Settings Partial Failure 2026-05-31

> [!success] 결과
> CLI review opener, Backend deployment config validation, Frontend settings partial-failure UX를 한 번에 닫은 상용화 hardening pass입니다.

## 변경 요약

- CLI
  - `openBrowser()`가 Windows에서 `cmd /c start "" <url>`을 사용하도록 보강했습니다.
  - WSL은 계속 `wslview`, macOS는 `open`, Linux는 `xdg-open`을 사용합니다.
  - `agentfeed open` / `agentfeed open --latest` / `agentfeed open --id <draft_id>` help와 README를 보강했습니다.
  - cached review URL은 AgentFeed public host 또는 configured local/custom API base와 맞을 때만 열리도록 trusted URL 회귀 테스트를 추가했습니다.
- Backend
  - production `ALLOWED_ORIGINS` / `API_ALLOWED_HOSTS`가 `","` 같은 빈 list로 우회되지 않도록 fail-fast validation을 추가했습니다.
  - `API_ALLOWED_HOSTS`는 scheme/path/query/fragment/credential/port가 없는 hostname token만 허용합니다.
  - `TRUSTED_PROXY_IPS`는 startup에서 IP 또는 CIDR만 허용합니다.
- Frontend
  - Settings page가 `me.settings()`, `me.integrations()`, `me.ingestionTokens()`를 all-or-nothing `Promise.all`로 묶지 않도록 `Promise.allSettled`로 분리했습니다.
  - integrations/tokens 장애가 있어도 privacy/notification settings는 계속 표시·저장할 수 있습니다.
  - section-level alert와 source contract test를 추가했습니다.

## 검증 증거

> [!success] 실행 완료
> 전체 dev 통합 gate까지 통과했습니다.

- CLI targeted: `npm test -- --run tests/open-browser.test.ts tests/cli-share.test.ts` → 13 tests passed
- CLI typecheck: `npm run typecheck` → passed
- CLI full: `npm run typecheck -- --pretty false && npm test -- --run` → 19 files / 230 tests passed
- Backend targeted: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app/config.py tests/test_contracts.py && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q tests/test_contracts.py -k 'production_settings or trusted_proxy_ips or development_settings'` → 8 passed
- Backend full: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests alembic && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 176 passed, 1 known Starlette deprecation warning
- Frontend full: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Cross-repo integration: `make test` in `agentfeed-dev` → passed, including CLI tests, frontend contracts/build, backend tests, npm audit, Alembic offline migration chain
- Diff hygiene: `git diff --check` in CLI/Backend/Frontend → passed

## 남은 리스크

> [!warning]
> 이번 루프는 automated contract 수준의 상용화 hardening입니다. 실제 운영 배포 전 아래 수동/환경 검증은 별도 확인이 필요합니다.

- Real Windows shell에서 browser launch 수동 검증은 아직 하지 않았습니다.
- Production/staging의 실제 `API_ALLOWED_HOSTS`, `TRUSTED_PROXY_IPS`, proxy topology 값은 배포 환경에서 한 번 더 검증해야 합니다.
- Frontend settings page의 browser-level interaction harness는 아직 pure source contract 중심입니다.

## 연결

- [[Auth & Credential Safety#2026-05-31 Cross-platform browser opener and open command trust]]
- [[Runtime Configuration#2026-05-31 Backend host and proxy config fail-fast]]
- [[Integration - CLI Backend Frontend#2026-05-31 Settings partial failure and cross-platform open contracts]]
- [[Active Tasks#P1 후보]]
