---
title: CLI Response Contract Module Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - api-contract
  - refactor
  - enterprise-readiness
  - response-envelope
status: done
related:
  - "[[CLI Trusted URL Helper Split 2026-06-11]]"
  - "[[CLI API JSON Boundary Guard 2026-06-10]]"
  - "[[CLI Non JSON Error Diagnostics 2026-06-10]]"
---

# CLI Response Contract Module Split 2026-06-11

## 요약

CLI `src/api/client.ts`는 API transport뿐 아니라 response envelope parsing, error envelope parsing, non-JSON diagnostics, `AgentFeedApiError` 정의까지 함께 포함하고 있었다. 이 책임은 CLI auth / ingest / metadata 모든 API 경계에서 공유되므로 독립 모듈로 분리하는 것이 이후 contract mismatch 수정을 더 안전하게 만든다.

이번 작업은 신규 기능이 아니라 **API response/error contract parser를 독립 모듈로 분리한 behavior-preserving enterprise-readiness refactor**다.

## 변경

- `src/api/errors.ts`
  - `AgentFeedApiError`를 독립 모듈로 이동
  - 기존 `src/api/client.ts` public export는 유지
- `src/api/response-contract.ts`
  - `hasOnlyExpectedFields()`
  - `parseApiErrorEnvelope()`
  - `apiErrorResponseSummary()`
  - `readResponseJson()`
  - `responseDataEnvelope()`
  - data/error envelope field constants
  - non-JSON error response diagnostics 연결
- `src/api/client.ts`
  - response/error contract helper import로 전환
  - response parsing 책임 약 79 LOC 제거
  - `src/api/client.ts` pure LOC: 1117 → 1048

## 검증

Targeted regression:

```bash
npm test -- --run tests/api-hook.test.ts tests/api-client-json-boundary.test.ts tests/api-non-json-error-diagnostics.test.ts
```

결과: 3 files / 135 tests passed.

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
mcp_lsp.diagnostics src/api/response-contract.ts
```

결과: `typescript-language-server` 미설치로 LSP 검증은 실행 불가. 대신 `npm run typecheck`, build, targeted/full test로 대체했다.

## 작업 중 발견 / 조치

초기 분리 직후 `DATA_RESPONSE_ENVELOPE_FIELDS` import가 누락되어 targeted test가 실패했다. 실패 상태로 진행하지 않고 `response-contract.ts`에서 constant를 export/import하도록 수정한 뒤 targeted suite를 다시 통과시켰다.

## 제약 / 남은 리스크

> [!warning]
> `src/api/client.ts`는 분리 후에도 1048 pure LOC로 oversized다. 다만 API error/response envelope 책임이 빠졌기 때문에 다음 분리 단위가 더 안전해졌다.

다음 후보:

1. CLI auth session lifecycle 분리 — 이제 `AgentFeedApiError`와 response contract가 독립되어 난이도가 낮아짐
2. publish draft lock/duplicate reuse 분리
3. ingestion token status parser 분리

- 기능 추가 없음. 기존 public export와 error behavior는 유지했다.
- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
