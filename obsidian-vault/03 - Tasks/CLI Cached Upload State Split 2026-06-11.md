---
title: CLI Cached Upload State Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - api-contract
  - refactor
  - verification
status: done
---

# CLI Cached Upload State Split 2026-06-11

## 요약

Cached upload reuse 판단과 duplicate ingestion reconciliation 책임을 `src/api/cached-upload.ts`로 분리했다.

> [!success]
> 신규 기능 없이 `publishDraft`의 동작을 유지하면서, cached upload 상태 판단/metadata 생성/duplicate ingest 복구 로직을 전용 모듈로 이동했다.

## 변경 파일

- `src/api/cached-upload.ts`
  - `CachedUploadReuseFailureReason`, `CachedUploadReuseStatus`
  - `cachedUploadReuseStatusForCredentials`
  - `cachedUploadReusableForCredentials`
  - `parseCachedUploadResult`
  - `assertCachedUploadPayloadCurrent`
  - `cachedUploadCredentialBindingMatches`
  - `uploadMetadataForCredentials`
  - `duplicateIngestResult`
- `src/api/client.ts`
  - cached upload 구현 제거
  - 기존 public 함수/타입 import 경로 호환을 위해 재-export 유지
  - `publishDraftWithLock`은 publish orchestration만 유지

## 검증

### Targeted

```bash
npm run typecheck
npm test -- --run tests/api-hook.test.ts tests/cli-share.test.ts
```

결과: 2 files / 186 tests passed

### Final

```bash
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

결과:

- full tests: 35 files / 610 tests passed
- typecheck/build/diff check 통과
- LOC review:
  - `src/api/cached-upload.ts`: 105 pure LOC
  - `src/api/client.ts`: 422 pure LOC

> [!warning]
> LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가했다. 대신 `npm run typecheck`, `npm run build`, targeted/full Vitest suite로 검증했다.

## 후행 과제

- `src/api/client.ts`는 516 → 422 pure LOC로 줄었지만 아직 250 pure LOC 기준을 넘는다.
- 다음 분리 후보:
  - API network retry / timeout policy
  - API reachability / compatibility check orchestration
  - auth/post JSON transport helper
- `tests/api-hook.test.ts`는 여전히 커서 관심사별 테스트 파일 분리가 필요하다.

## 배포

현재 goal 규칙상 서버/인프라/배포는 보류하므로 수행하지 않았다.
