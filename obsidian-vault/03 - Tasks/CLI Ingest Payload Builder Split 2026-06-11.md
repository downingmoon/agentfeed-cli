---
title: CLI Ingest Payload Builder Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - api-contract
  - refactor
  - enterprise-readiness
  - ingestion
status: done
related:
  - "[[CLI Repository URL Embedded Host Guard 2026-06-11]]"
  - "[[Frontend API Contract Hub Split Candidate 2026-06-11]]"
---

# CLI Ingest Payload Builder Split 2026-06-11

## 요약

CLI `src/api/client.ts`는 API reachability, auth session, ingest upload, draft lock, duplicate handling, response parsing을 모두 포함하는 oversized API hub다. 직전 `repository_url` contract guard도 이 파일의 ingest payload builder를 수정해야 했다.

이번 작업은 신규 기능이 아니라 **Backend ingest payload contract 변경 시 거대 API client를 계속 건드리지 않도록 `draftToIngestRequest()`를 독립 모듈로 분리한 behavior-preserving refactor**다.

## 변경

- `src/api/ingest-request.ts`
  - `draftToIngestRequest()`를 38 pure LOC 단일 책임 모듈로 이동
  - 책임: `LocalDraft` → Backend `IngestWorklogRequest` payload 변환
  - 기존 privacy redaction/upload URL sanitizer/hash 정책 유지
- `src/api/client.ts`
  - `draftToIngestRequest`를 새 모듈에서 import
  - 기존 public import surface를 깨지 않도록 `export { draftToIngestRequest } from './ingest-request.js'` 유지
  - net effect: `src/api/client.ts`에서 ingest payload builder 37 LOC 제거

## 검증

Targeted regression:

```bash
npm test -- --run tests/privacy-url.test.ts tests/api-hook.test.ts tests/git-draft.test.ts
```

결과: 3 files / 159 tests passed.

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
mcp_lsp.diagnostics src/api/ingest-request.ts
```

결과: `typescript-language-server` 미설치로 LSP 검증은 실행 불가. 대신 `npm run typecheck`, build, targeted/full test로 대체했다.

## 제약 / 남은 리스크

> [!warning]
> `src/api/client.ts`는 분리 후에도 1219 pure LOC로 여전히 oversized다. 다음 refactor 후보는 아래 순서가 적합하다.
>
> 1. CLI auth session lifecycle parser/client 분리
> 2. publish draft lock/duplicate reuse 분리
> 3. response envelope/error parsing 분리

- 기능 추가 없음. 기존 public export와 테스트 import 경로는 유지했다.
- 서버/인프라/CICD/배포 작업은 현재 goal 제약에 따라 수행하지 않았다.
