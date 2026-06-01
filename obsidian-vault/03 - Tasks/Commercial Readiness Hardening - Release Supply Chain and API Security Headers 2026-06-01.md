---
title: Commercial Readiness Hardening - Release Supply Chain and API Security Headers 2026-06-01
aliases:
  - Release supply chain and API security headers
  - 2026-06-01 release pins API headers
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/security
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - Release Supply Chain and API Security Headers 2026-06-01

> [!abstract] 목적
> npm release path와 Backend API response boundary를 상용 배포 기준으로 보강합니다. CLI는 immutable GitHub Actions pin + tarball allowlist를 fail-closed로 검증하고, Backend는 모든 API 응답에 기본 security header를 일관되게 붙입니다.

## 발견한 gap

- Release workflow가 `actions/checkout@v6`, `actions/setup-node@v6` tag pin만 사용해 upstream tag mutation에 취약했습니다.
- `release:preflight`의 `npm pack --dry-run --json`이 package lifecycle script를 다시 실행해, test suite가 `dist/cli/index.js`를 쓰는 동안 `prepack`의 `clean`과 경합할 수 있었습니다.
- 현재 `package.json.files`는 좁았지만, preflight denylist가 `docs/`, `obsidian-vault/`, `.github/`, `AGENTS.md` 같은 project-only artifact 재유입을 명시적으로 차단하지 않았습니다.
- Backend response에는 `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` 같은 기본 security header가 일괄 적용되지 않았습니다.

## 수정

### CLI release gate

- `.github/workflows/release.yml`과 `.github/workflows/ci.yml`의 `actions/checkout` / `actions/setup-node`를 v6 tag가 가리키는 40자 commit SHA로 고정했습니다.
- `scripts/release-preflight.mjs`가 release workflow의 pinned action SHA를 검증합니다.
- `release:preflight`의 tarball 검증은 `npm pack --dry-run --json --ignore-scripts`를 사용해 이미 실행된 build/test gate와 중첩 lifecycle 경합을 만들지 않습니다.
- `package.json.files`는 정확히 `['dist', 'README.md']`만 허용하도록 고정했습니다.
- tarball payload는 `dist/**`, `README.md`, `package.json` 외 파일이 들어오면 실패합니다.
- `docs/`, `obsidian-vault/`, `.github/`, `.codex/`, `AGENTS.md` 등 local-only 문서/상태 파일 denylist를 추가했습니다.

### Backend security headers

- `app/main.py`에 `apply_security_headers()` helper를 추가했습니다.
- 정상 응답과 unhandled error response에 공통 security header를 적용합니다.
- production mode에서는 HSTS와 API CSP도 적용하도록 helper 계약을 고정했습니다.

## 검증 증거

- CLI: `npm test -- --run tests/release-preflight.test.ts tests/version.test.ts` → 11 passed
- CLI: `npm run build` → passed
- CLI: `npm run release:preflight` → passed, `npm pack --dry-run --json --ignore-scripts` 검증
- CLI: `npm pack --dry-run --json` → prepack full gate 통과, tarball contains only `README.md`, `package.json`, `dist/**`
- CLI: `npm test -- --run` → 285 passed
- CLI: `npm run typecheck` → passed
- Backend: `uv run pytest tests/test_contracts.py -k 'security_headers or request_id_header_is_returned_on_unhandled_error' -q` → 3 passed
- Backend: `uv run ruff check app/main.py tests/test_contracts.py` → passed
- Backend: `uv run ruff check .` → passed
- Backend: `uv run pytest -q` → 263 passed, 1 warning
- Cross-repo: `agentfeed-dev ./scripts/test-all.sh` → CLI 285 passed, Frontend CI/build passed, Backend 263 passed + Alembic offline chain passed

## 연결

- [[Runtime Configuration#2026-06-01 Release supply chain and API security headers]]
- [[Integration - CLI Backend Frontend#2026-06-01 Release supply chain and API security headers]]
- [[Active Tasks]]
