---
title: Commercial Readiness Audit 2026-05-30
date: 2026-05-30
tags:
  - agentfeed/commercial-readiness
  - security/audit
  - project/tasks
status: in-progress
aliases:
  - 2026-05-30 상용화 readiness 감사
---

# Commercial Readiness Audit 2026-05-30

> [!summary]
> CLI / Backend / Frontend 3개 레포를 병렬로 상용화 readiness 관점에서 재감사했고, 토큰/개인정보 노출과 공개 surface contract 위반을 P1 우선순위로 보정했습니다.

## 감사 범위

- [[AgentFeed CLI MOC|AgentFeed CLI]] — token storage, upload payload, privacy scanner, API response trust boundary
- [[Integration - CLI Backend Frontend|Backend integration]] — public worklog surfaces, bookmarks, search discovery
- [[Runtime Configuration|Frontend runtime]] — API URL config, safe error UX, clickjacking headers

## 이번 루프에서 수정한 P1

### CLI token / local privacy boundary

- [x] 저장된 ingestion token이 repo-local `.env`의 `AGENTFEED_API_BASE_URL`로 전송될 수 있는 precedence 문제 수정
- [x] `HOME`/`USERPROFILE` 부재 시 project cwd에 global credential file을 쓰는 fallback 제거
- [x] `af_live_*`, `af_test_*`, `af_dev_*` token redaction 추가
- [x] 공백/유니코드가 포함된 POSIX/Windows/UNC local path redaction 보강
- [x] Git remote / repository URL userinfo 제거 후 draft/upload payload에 반영
- [x] upload success / duplicate response의 `review_url`과 response shape 검증 후 draft uploaded 상태 전환
- [x] upload source payload에서 raw `host_label` 제거, `session_id` / `local_draft_id` hash alias 전송

### Backend public/privacy boundary

- [x] `/v1/me/bookmarks`가 private/unpublished 전환된 타인 worklog를 계속 반환하지 않도록 visibility gate 적용
- [x] public card/detail `source`를 allowlist(`agent`, `tool_version`, `collection_quality`)로 축소
- [x] public detail `privacy_scan`에서 raw findings/messages 제거, public status만 반환
- [x] `UserSettings.allow_search_indexing=false`를 search/user/project/prompt/suggestion discovery에 적용

### Frontend user-facing safety / runtime config

- [x] `ApiError.message`를 status/category 기반 safe message로 바꾸고 raw response body는 diagnostic field에만 보존
- [x] global anti-clickjacking/security headers 추가: `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy
- [x] production/non-local `NEXT_PUBLIC_API_URL=http://...` 차단
- [x] review page가 backend `preview.card_title/card_summary`를 실제 public preview로 렌더링하도록 수정
- [x] project detail route가 public listing 선조회에 의존하지 않고 `projects.get(slugOrId)`를 먼저 호출하도록 수정
- [x] deprecated/interative `next lint` 대신 deterministic `tsc --noEmit` lint gate로 전환

## 아직 남은 P1 후보

> [!warning]
> 이번 루프에서 모두 고치지는 않았지만, 상용화 전 별도 루프가 필요한 항목입니다.

- [x] Backend rate-limit identity가 untrusted `X-Forwarded-For`를 우선 신뢰하는 문제: trusted proxy allowlist 적용
- [x] Backend production safety가 `ENVIRONMENT=production` exact match에 의존하는 문제: non-development fail-closed 적용
- [x] Backend rate-limit shared store: Redis 신규 의존성 대신 기존 Postgres 기반 `rate_limit_events` + advisory lock으로 multi-worker/global quota 보강
- [x] Frontend `npm audit --omit=dev`의 Next/PostCSS moderate advisory: stable Next는 아직 vulnerable PostCSS를 pin하므로 targeted `overrides.next.postcss=8.5.15`와 audit gate로 mitigation
- [x] Backend full Ruff repo-wide cleanup: repo-wide `ruff check .` clean으로 전환, FastAPI `Depends` 기본값은 B008 project ignore로 명시

## 2026-05-30 backend shared rate-limit store 추가 루프

- Production/non-development의 `RATE_LIMIT_STORE=auto`는 database store로 해석됩니다.
- Development의 `auto`는 기존 in-memory store를 사용해 local bootstrapping을 가볍게 유지합니다.
- `RATE_LIMIT_STORE=memory`는 production-like env에서 fail-closed로 거부됩니다.
- Shared store는 `rate_limit_events(bucket_name, identity_hash, occurred_at)`와 PostgreSQL `pg_advisory_xact_lock`으로 bucket 단위 transaction race를 줄입니다.
- identity는 raw token/IP가 아니라 SHA-256 hash로 저장됩니다.

관련: [[Auth & Credential Safety#2026-05-30 Shared database rate-limit store]]

## 2026-05-30 backend 운영 보안 추가 루프

- Trusted proxy allowlist 없이는 `X-Forwarded-For` / `X-Real-IP`를 rate-limit identity로 사용하지 않습니다.
- `TRUSTED_PROXY_IPS`는 comma-separated IP/CIDR allowlist입니다.
- `ENVIRONMENT=development`는 local URLs만 허용합니다.
- `prod`, `staging` 등 non-development env는 production-like로 간주해 secure secret/OAuth/frontend/origin 값을 요구합니다.


## 2026-05-30 backend repo-wide Ruff cleanup 루프

- `uv run --python 3.12 --with ruff ruff check .`가 repo 전체에서 통과하도록 정리했습니다.
- import ordering, `datetime.UTC`, PEP 604 optional annotation, unused imports, SQLAlchemy boolean predicate, OAuth state exception chaining을 정리했습니다.
- SQLAlchemy relationship forward reference는 `TYPE_CHECKING` imports로 lint false-positive를 제거했습니다.
- FastAPI의 `Depends(...)`, `Query(...)` default argument 패턴은 framework idiom이라 `B008`을 project ignore에 명시했습니다.
- Pydantic generic response schema는 Python 3.12 type parameter syntax로 정리했습니다.

검증:

- `uv run --python 3.12 --with ruff ruff check .`
- `uv run --python 3.12 --with pytest --with pytest-asyncio pytest tests -q` → 95 passed
- `../agentfeed-dev/scripts/test-all.sh` → Backend `ruff check .`, Backend 95 tests, Alembic offline chain 포함

## 검증 로그

- Backend 추가 targeted: `uv run --with pytest --with pytest-asyncio pytest tests/test_contracts.py -q -k 'production_settings or development_settings or non_development_settings or rate_limit_identity'` → 10 passed
- Backend full: `uv run --with pytest --with pytest-asyncio pytest -q` → 89 passed
- Backend targeted ruff: `uv run --with ruff ruff check --select F,I app/config.py app/middleware/rate_limit.py tests/test_contracts.py` → passed
- CLI: `npm run typecheck && npm test` → 152 passed
- Backend: `uv run --with pytest --with pytest-asyncio pytest -q` → 84 passed
- Frontend: `npm run test:contracts && npm run lint` → passed

## 관련 영역 노트

- [[Auth & Credential Safety#2026-05-30 CLI credential trust boundary hardening]]
- [[Privacy Safety#2026-05-30 Public source/privacy discovery boundary]]
- [[Runtime Configuration#2026-05-30 Frontend production HTTPS API gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 Review preview and project detail contract]]
- [[Active Tasks#새로 발견한 P1 후보 / 다음 루프]]
