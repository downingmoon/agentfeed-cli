---
title: CLI Publish Response Parser Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - api-contract
  - refactor
  - verification
status: done
---

# CLI Publish Response Parser Split 2026-06-11

## 요약

CLI ingest preview/publish 응답 contract parser를 `src/api/publish-response.ts`로 분리했다.

> [!success]
> 신규 기능 없이 `previewDraftRemote`, `uploadDraft`, cached upload reuse, duplicate ingestion reconciliation의 기존 동작을 유지하면서 publish/preview 응답 검증 책임을 전용 모듈로 이동했다.

## 변경 파일

- `src/api/publish-response.ts`
  - `RemotePreviewPayload`, `RemotePreviewResult`
  - `PublishDraftStatus`, `PublishDraftVisibility`, `PublishDraftResult`
  - `parseRemotePreviewResult`
  - `parsePublishDraftResult`
  - `worklogIdFromReviewUrl`
  - cached upload status literal export
- `src/api/client.ts`
  - publish/preview response parser 구현 제거
  - 기존 public type export를 `publish-response.ts`에서 재-export하여 호환성 유지
- `tests/api-hook.test.ts`
  - backend visibility/status contract source guard가 새 parser 모듈을 확인하도록 업데이트

## 검증

### Targeted

```bash
npm run typecheck
npm test -- --run tests/api-hook.test.ts tests/api-client-json-boundary.test.ts
```

결과: 2 files / 133 tests passed

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
  - `src/api/publish-response.ts`: 108 pure LOC
  - `src/api/client.ts`: 526 pure LOC

> [!warning]
> LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가했다. 대신 `npm run typecheck`, `npm run build`, targeted/full Vitest suite로 검증했다.

## 후행 과제

- `src/api/client.ts`는 632 → 526 pure LOC까지 줄었지만 아직 250 pure LOC 기준을 넘는다.
- 다음 분리 후보:
  - cached upload reuse / duplicate ingestion reconciliation
  - API network retry / timeout policy
  - API reachability/compatibility check orchestration
- `tests/api-hook.test.ts`도 1885 pure LOC로 매우 크므로, 향후 테스트 파일도 publish/auth/metadata/lock 관심사별로 분리하는 것이 좋다.

## 배포

현재 goal 규칙상 서버/인프라/배포는 보류하므로 수행하지 않았다.
