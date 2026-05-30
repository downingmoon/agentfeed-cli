---
title: Host Token Race and Private Preview Guards 2026-05-31
aliases:
  - 2026-05-31 host token race private preview guards
  - Commercial readiness host and preview hardening
tags:
  - agentfeed/commercial-readiness
  - agentfeed/ultrawork
  - security/auth
  - security/privacy
  - backend/contracts
  - frontend/contracts
  - cli/trust-boundary
status: done
created: 2026-05-31
---

# Host Token Race and Private Preview Guards 2026-05-31

> [!success] 결과
> CLI pre-auth trust boundary, Claude Code hook failure isolation, Backend Host/token issuance hardening, public `user_note` privacy contract, Frontend unsafe preview guard를 한 루프로 닫았습니다.

## 변경 요약

- [[AgentFeed CLI MOC|CLI]]
  - Claude Code Stop hook command가 `agentfeed collect --source claude-code` 실패를 `.agentfeed/logs/hook.log`에 남기되 항상 exit `0`으로 끝나도록 변경했습니다.
  - `agentfeed login` / browser rotate flow가 pre-auth 단계에서 repo-local `.env` API discovery를 기본 신뢰하지 않습니다.
  - repo-local API base는 `AGENTFEED_TRUST_REPO_API_BASE=1` 또는 명시적 `--api-base-url` / `AGENTFEED_API_BASE_URL` / 저장된 credentials가 있을 때만 사용합니다.

- [[Runtime Configuration|Backend API]]
  - `API_ALLOWED_HOSTS` 설정과 `TrustedHostMiddleware`를 추가해 production Host header spoofing을 app layer에서 차단합니다.
  - ingestion token 발급 서비스가 user row lock과 quota check를 하나의 서비스 경계에서 수행해 caller가 lock을 누락하기 어렵게 만들었습니다.
  - `.env.example`에 `API_ALLOWED_HOSTS`, `INGESTION_TOKEN_TTL_DAYS`를 명시했습니다.

- [[Privacy Safety|Privacy contract]]
  - public card/detail payload에서 owner-only `user_note`를 `None`으로 내보냅니다.
  - review payload는 `worklog.user_note`를 owner review context로 유지하되 public preview에서는 `user_note`를 제외하고 `private_fields: ["user_note"]`, `safe_public_preview: true` 계약을 제공합니다.

- [[Integration - CLI Backend Frontend|Frontend]]
  - public worklog adapter가 API 응답에 `user_note`가 있더라도 `Worklog.userNote`로 노출하지 않습니다.
  - review page는 unsafe preview guard를 통해 `user_note`가 public field에 들어오거나 safe preview contract 없이 raw field mirror가 감지되면 public/unlisted publish를 차단합니다.
  - Backend safe preview contract가 있는 경우 title/summary가 public candidate와 같아도 publish를 불필요하게 막지 않습니다.

## 닫은 리스크

> [!warning] 기존 리스크
> 테스트가 green이어도 pre-auth API base phishing, Claude hook blocking, Host header spoofing, owner-only note public leak, token issuance caller lock 누락이 상용 환경에서 사용자 신뢰를 해칠 수 있었습니다.

- Claude Code Stop hook failure가 사용자 Claude session을 막을 수 있던 문제
- untrusted checkout의 `.env`가 `agentfeed login` authorize/API endpoint를 바꿀 수 있던 문제
- public Feed/Detail에 private `user_note`가 렌더링될 수 있던 문제
- Review page의 Public preview가 private/raw field mirror를 안전한 publish preview처럼 보여줄 수 있던 문제
- Backend production Host allowlist가 reverse proxy 설정에만 의존하던 문제
- Ingestion token quota lock 호출이 서비스 외부 caller discipline에 의존하던 문제

## 검증

- CLI: `npm run typecheck && npm test -- --run` → 195 passed
- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Backend: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q && uv run alembic upgrade head --sql` → 159 passed + offline migration chain generated
- Diff hygiene: `git diff --check` → 3개 레포 passed
- Integration: `agentfeed-dev make test` → passed (CLI tests/typecheck/prepack/audit, Frontend contract/audit/build, Backend ruff/pytest/Alembic offline).

## 관련 링크

- [[Auth & Credential Safety#2026-05-31 Pre-auth API trust boundary and hook isolation]]
- [[Runtime Configuration#2026-05-31 Trusted host and token issuance hardening]]
- [[Privacy Safety#2026-05-31 Private user note public-surface guard]]
- [[Integration - CLI Backend Frontend#2026-05-31 Private preview and API host hardening]]
- [[Active Tasks#2026-05-31 host token race private preview continuation]]
