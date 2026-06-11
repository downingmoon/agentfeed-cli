---
title: CLI Draft Upload Hash Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Draft Upload Hash Split 2026-06-11

## 요약

Draft upload payload hash와 credential binding hash 계산을 `src/api/draft-upload-hash.ts`로 분리했다.

> [!success]
> 신규 기능 없이 기존 `client.ts` public export를 유지하면서 cached upload reuse의 기반 계산 책임을 전용 모듈로 이동했다.

## 변경 파일

- `src/api/draft-upload-hash.ts`
  - `draftUploadPayloadHash`
  - `draftUploadCredentialBindingHash`
- `src/api/client.ts`
  - hash helper 구현 제거
  - 기존 import 경로 호환을 위해 동일 helper를 재-export

## 검증

### Targeted

```bash
npm run typecheck
npm test -- --run tests/api-hook.test.ts tests/cli-share.test.ts tests/cli-collect.test.ts
```

결과: 3 files / 209 tests passed

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
  - `src/api/draft-upload-hash.ts`: 14 pure LOC
  - `src/api/client.ts`: 516 pure LOC

> [!warning]
> LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가했다. 대신 `npm run typecheck`, `npm run build`, targeted/full Vitest suite로 검증했다.

## 후행 과제

- cached upload reuse / duplicate ingestion reconciliation을 다음 별도 모듈로 분리하기 쉬워졌다.
- `src/api/client.ts`는 아직 250 pure LOC 기준을 넘는다.
- `tests/api-hook.test.ts`도 관심사별 분리 대상이다.

## 배포

현재 goal 규칙상 서버/인프라/배포는 보류하므로 수행하지 않았다.
