---
title: CLI Trusted URL Helper Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - api-contract
  - refactor
  - enterprise-readiness
  - auth
  - review-url
status: done
related:
  - "[[CLI Ingest Payload Builder Split 2026-06-11]]"
  - "[[Backend CLI Auth Authorize URL Origin Normalization 2026-06-10]]"
---

# CLI Trusted URL Helper Split 2026-06-11

## 요약

CLI `src/api/client.ts`는 publish review URL validation과 CLI browser auth authorize URL validation까지 함께 포함하고 있었다. 두 경계는 모두 Backend가 반환한 URL을 로컬에서 신뢰해도 되는지 판단하는 contract guard이며, API client transport와 분리 가능한 책임이다.

이번 작업은 신규 기능이 아니라 **auth/review URL trust policy를 단일 모듈로 분리한 behavior-preserving enterprise-readiness refactor**다.

## 변경

- `src/api/trusted-url.ts`
  - review URL / authorize URL trust helper 이동
  - 포함 책임:
    - local/API/review host 관계 검증
    - insecure public IPv4 review origin opt-in 검증
    - `agentfeed.dev` API host와 review host 관계 검증
    - review URL path/query/hash/userinfo 제한
    - CLI authorize URL path/query/hash/userinfo 제한
  - 기존 broad `catch { return false/null }` 형태를 `TypeError` narrowing 후 처리하도록 정리
- `src/api/client.ts`
  - `trustedReviewOrigin`, `validateReviewUrl`, `validateAuthorizeUrl` import로 전환
  - URL trust helper 약 115 LOC 제거
  - 기존 public API surface 변경 없음

## 검증

Targeted regression:

```bash
npm test -- --run tests/api-hook.test.ts tests/api-non-json-error-diagnostics.test.ts
```

결과: 2 files / 134 tests passed.

Full verification:

```bash
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

결과:

- typecheck 통과
- build 통과
- 전체 Vitest: 35 files / 610 tests passed
- diff whitespace check 통과

추가 확인:

```bash
mcp_lsp.diagnostics src/api/trusted-url.ts
```

결과: `typescript-language-server` 미설치로 LSP 검증은 실행 불가. 대신 `npm run typecheck`, build, targeted/full test로 대체했다.

## 제약 / 남은 리스크

> [!warning]
> `src/api/client.ts`는 분리 후에도 1117 pure LOC로 oversized다. 다만 이번 slice로 URL trust policy가 API transport/client hub에서 빠졌고, 다음 분리 단위가 더 선명해졌다.

다음 후보:

1. CLI auth session parser/client 분리 — 단, 공통 `postJson`/error envelope와 함께 분리 계획 필요
2. publish draft lock/duplicate reuse 분리
3. API response envelope/error parser를 `src/api/response-contract.ts`로 분리

- 기능 추가 없음. URL 정책 결과가 바뀌지 않도록 기존 test suite로 검증했다.
- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
