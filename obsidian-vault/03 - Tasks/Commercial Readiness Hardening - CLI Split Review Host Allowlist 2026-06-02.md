---
title: Commercial Readiness Hardening - CLI Split Review Host Allowlist 2026-06-02
aliases:
  - CLI split review host allowlist
  - AGENTFEED_REVIEW_BASE_URL trust boundary
  - Self-hosted review frontend allowlist
  - Split API review URL trust
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/runtime-config
  - agentfeed/security
  - agentfeed/integration
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - CLI Split Review Host Allowlist 2026-06-02

> [!success] 목표
> Self-hosted/enterprise 배포에서 API host와 review frontend host가 다른 경우에도 CLI가 private review URL을 안전하게 수락하고 `agentfeed open`으로 다시 열 수 있게 하되, query/hash/credential/path/host trick은 계속 차단합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P1 후보]]
- 통합 기준: [[Integration - CLI Backend Frontend#2026-06-02 CLI split review host allowlist]]
- 런타임 설정 영역: [[Runtime Configuration#2026-06-02 CLI split review host allowlist]]
- 후보 근거: [[Commercial Readiness Hardening - Settings Notifications and API Base Parity 2026-06-02#후속 후보]]

## 변경 범위

- `AgentFeed-CLI/src/api/client.ts`
  - `AGENTFEED_REVIEW_BASE_URL`을 exact-origin review frontend allowlist로 처리.
  - Remote review origin은 HTTPS만 허용.
  - allowlist 값 자체도 protocol, credentials, query/hash, path 없는 origin이어야 함.
  - 기존 review URL 검사 불변식 유지: no credentials, no query/hash, `/review/{id}` 또는 `/worklogs/{id}/review` path만 허용.
  - `publishDraft`, duplicate resync, cached upload parsing, `agentfeed open`이 같은 `isTrustedReviewUrl` policy를 공유.
- `AgentFeed-CLI/tests/api-hook.test.ts`
  - API host `https://api.internal.example/v1`, review URL `https://review.internal.example/...` 조합을 `AGENTFEED_REVIEW_BASE_URL`로 수락하는 upload contract 추가.
- `AgentFeed-CLI/tests/cli-share.test.ts`
  - `agentfeed open` split-host positive case 추가.
  - allowlist 없을 때 split-host 거부 고정.
  - query/hash/http/suffix-host trick 거부 고정.
- `AgentFeed-CLI/README.md`
  - `AGENTFEED_REVIEW_BASE_URL` exact origin 사용법과 remote HTTPS/no credentials/no query/hash/no path 조건 문서화.

## 고정된 계약

- CLI는 API가 반환했다는 이유만으로 임의 review host를 신뢰하지 않습니다.
- Custom review frontend host는 `AGENTFEED_REVIEW_BASE_URL`로 명시된 exact origin만 신뢰합니다.
- Remote custom review origin은 HTTPS여야 합니다.
- Cached review URL opening과 upload response acceptance는 같은 trust policy를 사용합니다.
- Local 개발 host와 built-in AgentFeed review host trust는 기존대로 유지합니다.

## 검증 증거

- RED: `npm test -- --run tests/api-hook.test.ts -t "split review frontend host"` 실패.
  - 실패 원인: `API_RESPONSE_INVALID`; split API/review host upload response가 기존 API-host-only trust에 막힘.
- RED: `npm test -- --run tests/cli-share.test.ts -t "split-host review URL"` 실패.
  - 실패 원인: `Saved draft review URL is invalid`; `agentfeed open`이 explicit review frontend origin을 사용하지 못함.
- GREEN: `npm test -- --run tests/api-hook.test.ts -t "split review frontend host"` 통과.
- GREEN: `npm test -- --run tests/cli-share.test.ts -t "split-host review URL"` 통과.
  - 6 tests passed: positive open, no-env rejection, unsafe query/hash/http/suffix-host rejections.
- GREEN: `npm test -- --run && npm run typecheck && npm run release:preflight && npm audit --audit-level=high` 통과.
  - CLI: 21 test files / 321 tests passed.
  - Typecheck passed.
  - Release preflight passed.
  - found 0 vulnerabilities.
- GREEN: `agentfeed-dev ./scripts/test-all.sh` 통과.
  - AgentFeed OpenAPI contract gate passed.
  - CLI: 321 tests passed, typecheck passed, release preflight passed, dependency audit passed.
  - Frontend: typecheck, contract tests, production build, dependency audit passed.
  - Backend: ruff passed, 284 tests passed, Alembic offline migration chain generated through `019_audit_events`.

## 남은 리스크

> [!warning]
> 현재 allowlist는 단일 `AGENTFEED_REVIEW_BASE_URL` exact origin입니다. 여러 review frontend host를 동시에 운영하는 조직에는 list형 env나 credentials metadata가 필요할 수 있지만, 우선 단일 명시 origin으로 trust boundary를 좁게 유지했습니다.
