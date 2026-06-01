---
title: Commercial Readiness Hardening - Frontend Dynamic Auth Next Query Allowlist 2026-06-01
aliases:
  - Dynamic Auth Next Query Allowlist
  - OAuth Next Dynamic Route Safe Query
  - Frontend Auth Next Deep Link Query Safety
tags:
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/integration
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Frontend Dynamic Auth Next Query Allowlist 2026-06-01

## 목적

Signed-out 사용자가 review/profile/project/worklog 같은 dynamic route에서 로그인할 때, 안전한 UI context query는 보존하고 `token`, `code`, `state` 같은 nested OAuth/security-sensitive query는 제거하도록 계약을 고정했습니다.

> [!important]
> Dynamic route의 query 보존은 prefix allowlist로만 확장합니다. 알 수 없는 query key를 그대로 `next`에 실으면 로그인 후 credential/token-like 값이 redirect chain에 남을 수 있습니다.

## 수정 요약

- `src/lib/auth-next.ts`에 dynamic path prefix별 safe query allowlist를 추가했습니다.
- `/worklogs/:id/review`는 `finding`, `tab`, `comment`, `cursor`만 보존합니다.
- `/profile/:username`, `/projects/*`, `/worklog/*`는 해당 화면의 route-local context query만 보존합니다.
- `githubUrl(next)`가 encoded `next` 내부에서도 dynamic route safe query만 싣는 contract를 추가했습니다.

## 계약

- Static allowlist는 기존 exact path rule을 유지합니다.
- Dynamic allowlist는 prefix match + key allowlist 조합으로만 동작합니다.
- Unsafe/nested OAuth query(`token`, `code`, `state` 등)는 dynamic route에서도 drop됩니다.
- Review deep link의 `finding`/`tab` context는 로그인 왕복 후에도 유지됩니다.

## TDD 기록

> [!bug] RED
> `src/lib/api-contract.test.ts`에 dynamic review/profile route query preservation 계약을 먼저 추가했고, `npm run test:contracts`가 `dynamic review route sign-in redirects must preserve safe deep-link query params and drop unsafe keys`로 실패했습니다.

> [!success] GREEN
> `ALLOWED_QUERY_KEYS_BY_PATH_PREFIX`를 추가해 dynamic route safe query를 보존하고, unknown/security-sensitive query는 기존 sanitizer로 제거하도록 정렬했습니다.

## 검증 증거

- RED:
  - `npm run test:contracts`
  - 결과: expected failure `dynamic review route sign-in redirects must preserve safe deep-link query params and drop unsafe keys`
- Frontend targeted/full gates:
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `npm run ci` → typecheck, contract tests, production build passed
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check` → clean
- Cross-repo gate:
  - `agentfeed-dev make test`
  - 결과: OpenAPI contract gate, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 통과

## 남은 리스크

> [!note]
> 실제 GitHub OAuth 브라우저 왕복을 모든 dynamic route/query 조합으로 실행하지는 않았습니다. 현재 검증은 sanitizer contract, production build, cross-repo gate 기준입니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend dynamic auth next query allowlist]]
- [[Auth & Credential Safety]]
- [[Active Tasks#P1 후보]]
