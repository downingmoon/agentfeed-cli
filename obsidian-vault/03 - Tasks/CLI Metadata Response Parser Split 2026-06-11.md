---
title: CLI Metadata Response Parser Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Metadata Response Parser Split 2026-06-11

## 요약

CLI API client에 남아 있던 metadata compatibility 응답 파싱 책임을 `src/api/metadata-response.ts`로 분리했다.

> [!success]
> 기능 추가 없이 기존 `checkApiCompatibility` 동작과 public `ApiMetadata` export를 유지하면서, metadata 응답 envelope 검증과 JSON 파싱 경계를 전용 모듈로 이동했다.

## 변경 파일

- `src/api/metadata-response.ts`
  - metadata response content-type 확인
  - `data` envelope 존재 및 허용 필드 검증
  - `parseApiMetadata` 적용
  - JSON 파싱 오류를 명확한 metadata contract error로 변환
- `src/api/client.ts`
  - metadata response parser 구현 제거
  - `parseMetadataResponse` import로 orchestration만 유지
- `tests/api-client-json-boundary.test.ts`
  - JSON boundary source guard를 `client.ts` 단일 파일 기준에서 parser 모듈 포함 기준으로 업데이트
  - `response.json() as ...` 형태의 unsafe cast를 parser 경계 전체에서 금지

## 검증

```bash
npm test -- --run tests/api-hook.test.ts tests/api-client-json-boundary.test.ts
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

결과:

- targeted tests: 2 files / 133 tests passed
- full tests: 35 files / 610 tests passed
- typecheck/build/diff check 통과
- LOC review:
  - `src/api/metadata-response.ts`: 31 pure LOC
  - `src/api/client.ts`: 915 pure LOC
  - `tests/api-client-json-boundary.test.ts`: 15 pure LOC

> [!warning]
> LSP diagnostics는 `typescript-language-server`가 설치되어 있지 않아 실행 불가했다. 대신 `npm run typecheck`, `npm run build`, 전체 Vitest suite로 검증했다.

## 남은 리스크 / 후행 과제

- `src/api/client.ts`는 계속 축소 중이지만 아직 250 pure LOC 기준을 넘는다.
- 다음 분리 후보:
  - CLI auth lifecycle orchestration
  - publish draft locking / duplicate handling
  - API compatibility check orchestration

## 배포

서버 배포는 현재 goal 규칙상 금지되어 있어 수행하지 않았다.
