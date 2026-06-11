---
title: CLI Ingestion Token Status Parser Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - api-contract
  - refactor
  - enterprise-readiness
  - ingestion-token
status: done
related:
  - "[[CLI Response Contract Module Split 2026-06-11]]"
  - "[[CLI API JSON Boundary Guard 2026-06-10]]"
---

# CLI Ingestion Token Status Parser Split 2026-06-11

## 요약

CLI `src/api/client.ts`는 API client transport와 함께 ingestion token status response parser를 포함하고 있었다. 이 parser는 `checkApiReachability()`와 `checkIngestionToken()`의 Backend contract를 검증하는 독립 boundary이므로 별도 모듈로 분리하는 편이 이후 계약 변경을 안전하게 만든다.

이번 작업은 신규 기능이 아니라 **ingestion token status response contract parser를 독립 모듈로 분리한 behavior-preserving enterprise-readiness refactor**다.

## 변경

- `src/api/ingestion-token-status.ts`
  - `IngestionTokenStatus` 타입 이동
  - `parseCheckData()` 이동
  - `parseIngestionTokenStatusResponse()` 이동
  - token/user/status field allowlist와 날짜/optional string parser 이동
  - JSON parse 실패 처리를 `SyntaxError | TypeError` narrowing으로 명시
- `src/api/client.ts`
  - `IngestionTokenStatus` public type export 유지
  - status parser import로 전환
  - status parsing 책임 약 123 LOC 제거
  - `src/api/client.ts` pure LOC: 1048 → 935

## 검증

Targeted regression:

```bash
npm test -- --run tests/api-hook.test.ts tests/api-client-json-boundary.test.ts
```

결과: 2 files / 133 tests passed.

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
mcp_lsp.diagnostics src/api/ingestion-token-status.ts
```

결과: `typescript-language-server` 미설치로 LSP 검증은 실행 불가. 대신 `npm run typecheck`, build, targeted/full test로 대체했다.

## 제약 / 남은 리스크

> [!warning]
> `src/api/client.ts`는 분리 후에도 935 pure LOC로 oversized다. 다만 ingestion status contract가 독립되어 다음 refactor에서 client transport와 draft publish orchestration을 더 안전하게 분리할 수 있다.

다음 후보:

1. CLI auth session lifecycle 분리
2. publish draft lock/duplicate reuse 분리
3. metadata compatibility response parser 분리

- 기능 추가 없음. 기존 public export와 status error message는 유지했다.
- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
