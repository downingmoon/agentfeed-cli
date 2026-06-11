---
title: CLI Draft Upload Lock Module Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - verification
status: done
---

# CLI Draft Upload Lock Module Split 2026-06-11

## 요약

CLI `src/api/client.ts`에 남아 있던 draft upload lock 책임을 `src/api/draft-upload-lock.ts`로 분리했다.

> [!success]
> 신규 기능 없이 기존 `publishDraft` 동작을 유지하면서, 동시 publish 방지/lock heartbeat/stale lock 진단/lock release 책임을 전용 모듈로 이동했다.

## 변경 파일

- `src/api/draft-upload-lock.ts`
  - `acquireDraftUploadLock` 공개
  - lock timeout / heartbeat env 처리
  - stale lock 제거
  - lock diagnostics 및 fingerprint 생성
  - heartbeat failure를 `AgentFeedApiError`로 변환
  - release 시 token hash가 일치할 때만 lock file 삭제
- `src/api/client.ts`
  - draft upload lock 구현 제거
  - `publishDraft`는 lock acquire/release orchestration만 유지

## 검증

### 회귀 검증

```bash
npm test -- --run tests/api-hook.test.ts tests/api-non-json-error-diagnostics.test.ts
```

첫 실행에서 `shortHash` import 제거 실수가 회귀로 잡혔고, import를 복구한 뒤 동일 targeted suite가 통과했다.

### 최종 검증

```bash
npm run typecheck
npm run build
npm test -- --run
git diff --check
```

결과:

- targeted tests: 2 files / 134 tests passed
- full tests: 35 files / 610 tests passed
- typecheck/build/diff check 통과
- LOC review:
  - `src/api/draft-upload-lock.ts`: 215 pure LOC
  - `src/api/client.ts`: 729 pure LOC

> [!warning]
> LSP diagnostics는 `typescript-language-server`가 설치되어 있지 않아 실행 불가했다. 대신 `npm run typecheck`, `npm run build`, targeted/full Vitest suite로 검증했다.

## 후행 과제

- `src/api/client.ts`는 아직 250 pure LOC 기준을 넘는다.
- 다음 분리 후보:
  - publish draft cache reuse / duplicate ingestion reconciliation
  - API network retry / timeout policy
  - CLI auth session parsing/orchestration

## 배포

현재 goal 규칙상 서버/인프라/배포는 보류이므로 수행하지 않았다.
