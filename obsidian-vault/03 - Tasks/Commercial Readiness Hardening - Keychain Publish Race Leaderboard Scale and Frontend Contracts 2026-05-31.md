---
title: Commercial Readiness Hardening - Keychain Publish Race Leaderboard Scale and Frontend Contracts 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/security
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
status: done
created: 2026-05-31
related:
  - "[[AgentFeed CLI MOC]]"
  - "[[Active Tasks]]"
  - "[[Auth & Credential Safety]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Keychain Publish Race Leaderboard Scale and Frontend Contracts 2026-05-31

> [!success] 결과
> CLI token 저장, Backend publish/leaderboard, Frontend contract regression 영역을 상용화 hardening 관점에서 보강하고 3레포 통합 검증까지 완료했다.

## 변경 요약

### CLI

- `AGENTFEED_CREDENTIAL_STORE=auto|file|keychain` 및 테스트 주입 가능한 `SecretStore` abstraction 추가.
- 기본 테스트 환경은 파일 저장을 유지하고, 실사용 `auto` 모드에서는 OS keychain 사용 가능 시 token을 keychain에 저장한다.
- keychain 저장 시 `credentials.json`에는 API/user/expiry/keychain metadata만 남기고 `ingestion_token`은 저장하지 않는다.
- `agentfeed status`, `agentfeed doctor`에 credential store provenance를 표시한다.

> [!note] 플랫폼 정책
> macOS는 `security`, Linux는 `secret-tool`을 no-new-dependency 방식으로 사용한다. keychain unavailable + `auto`는 기존 private file fallback으로 유지하고, explicit `keychain` 모드는 실패를 노출한다.

### Backend

- `publish_worklog`에서 Worklog row를 `FOR UPDATE`로 잠그고, locked state 기준 public transition edge에서만 follower notification을 발행한다.
- Leaderboard viewer follow state를 row별 `check_following` N+1 대신 page author set 단일 query로 batch 처리한다.
- `longest_streak` source query를 author/day distinct row로 축소해 같은 날 다중 worklog 전송/집계를 줄인다.
- `worklogs(author_id, published_at)` public/published partial index와 Alembic `014_leaderboard_public_worklog_index` 추가.

### Frontend

- Explore category worklog path segment를 `pathSegment(slug)`로 encoding해 slash/query/hash 포함 category slug가 route를 깨지 않게 했다.
- Cursor pagination contract를 profile/project/explore category surfaces까지 확장했다.
- `appendUniqueBy` incoming-page duplicate 및 project slug/name fallback dedupe regression을 강화했다.
- React E2E 없이도 최근 partial-failure isolation 구조가 퇴행하지 않도록 source-level contract test를 추가했다.

## 검증 증거

- CLI: `npm run typecheck -- --pretty false && npm test -- --run` → 221 passed.
- Backend: `RUFF_NO_CACHE=1 uv run ruff check --no-cache app tests alembic && PYTEST_ADDOPTS='-p no:cacheprovider' uv run pytest -q` → 170 passed, known Starlette warning 1개.
- Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → pass.
- 통합: `agentfeed-dev make test` → CLI prepack/audit, Frontend contract/audit/build, Backend ruff/full tests, Alembic offline chain `014_leaderboard_public_worklog_index`까지 pass.
- Diff hygiene: `git diff --check` 3개 레포 pass.

## 남은 리스크

> [!warning]
> 전체 목표는 아직 active다. 이번 루프는 중요한 상용화 리스크를 줄였지만, 다음 항목은 추가 hardening 후보로 남긴다.

- CLI native keychain 실제 OS command smoke는 unit injection으로 검증했고, macOS/Linux 실제 keychain interactive 환경 smoke는 아직 별도 필요.
- CLI oversized/corrupt agent transcript parsing guard는 아직 미구현.
- Backend leaderboard는 batch/index 개선까지 완료했지만, 대규모 실DB `EXPLAIN ANALYZE` 기반 튜닝은 아직 필요.
- Frontend partial-failure는 source contract까지 보강했지만, 실제 browser/component rendering test harness는 아직 없다.

## 링크

- [[Auth & Credential Safety#CLI credential file permissions]]
- [[Integration - CLI Backend Frontend#End-to-end 흐름]]
- [[Active Tasks#P1 후보]]
