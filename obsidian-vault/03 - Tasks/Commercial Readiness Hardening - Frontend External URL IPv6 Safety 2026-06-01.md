---
title: Commercial Readiness Hardening - Frontend External URL IPv6 Safety 2026-06-01
aliases:
  - Frontend External URL IPv6 Safety
  - Project Link Private IPv6 Block
  - safeExternalUrl IPv6 Hardening
tags:
  - agentfeed/frontend
  - agentfeed/privacy
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Frontend External URL IPv6 Safety 2026-06-01

## 목적

Backend가 제공하는 project/profile external URL이 Frontend에서 outbound link로 렌더링될 때, IPv6 loopback/private/internal host literal을 통과시키지 않도록 `safeExternalUrl()` 계약을 보강했습니다.

> [!important]
> Backend URL schema validation이 있어도 Frontend link renderer는 독립적인 last-mile trust boundary입니다. 사용자가 클릭하는 URL은 public http(s), credential-free, non-private host로만 제한합니다.

## 수정 요약

- `safeExternalUrl()`이 IPv6 literal host를 정규화해 검사합니다.
- `::1`, `::`, `fc00::/7`, `fe80::/10`, `::ffff:*` mapped forms를 차단합니다.
- 기존 public bare domain normalization과 IPv4 private/localhost/userinfo 차단 계약은 유지했습니다.
- `api-contract.test.ts`에 IPv6 private/internal URL regression cases를 추가했습니다.

## 계약

- 허용: `github.com/downingmoon/agentfeed-cli` → `https://github.com/downingmoon/agentfeed-cli`
- 차단:
  - `http://[::1]/private`
  - `http://[::]/private`
  - `http://[fd00::1]/private`
  - `http://[fc00::1]/private`
  - `http://[fe80::1]/private`
  - `http://[::ffff:127.0.0.1]/private`
  - `http://[::ffff:7f00:1]/private`

## TDD 기록

> [!bug] RED
> `api-contract.test.ts`에 IPv6 private/internal URL 차단 케이스를 먼저 추가했고, `npm run test:contracts`가 `http://[::]/private`를 허용해 실패했습니다.

> [!success] GREEN
> `external-url.ts`에 IPv6 host normalization과 private/internal prefix checks를 추가했습니다.

## 검증 증거

- RED:
  - `npm run test:contracts`
  - 결과: expected failure `external project URL sanitizer must reject unsafe URL: http://[::]/private`
- Frontend targeted/full gates:
  - `npm run test:contracts` → passed
  - `npm run lint` → passed
  - `npm run ci` → typecheck, contract tests, production build passed
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check` → clean
- Cross-repo gate:
  - `agentfeed-dev make test`
  - 결과: OpenAPI contract gate, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 통과
- Parallel audit:
  - Frontend explore lane found external URL IPv6/private host hardening as a top commercialization trust/safety gap.
  - CLI explore lane found no additional high-confidence CLI commercialization gap after current P1s.

## 남은 리스크

> [!note]
> 실제 브라우저별 IPv6 literal 표시/normalization 전체 행렬을 수동 클릭 QA로 돌리지는 않았습니다. 현재 검증은 `URL` parser 기반 contract와 production build/cross-repo gate 기준입니다.

## 관련 링크

- [[Privacy Safety#2026-06-01 Frontend external URL IPv6 safety]]
- [[Integration - CLI Backend Frontend#2026-06-01 Frontend external URL IPv6 safety]]
- [[Active Tasks#P1 후보]]
