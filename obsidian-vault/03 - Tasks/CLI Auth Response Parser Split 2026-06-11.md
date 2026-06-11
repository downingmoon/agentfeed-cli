---
title: CLI Auth Response Parser Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - api-contract
  - refactor
  - verification
status: done
---

# CLI Auth Response Parser Split 2026-06-11

## 요약

CLI browser login에서 사용하는 auth session/exchange 응답 parser를 `src/api/cli-auth-response.ts`로 분리했다.

> [!success]
> 신규 기능 없이 `createCliAuthSession`, `exchangeCliAuthSession`의 API 호출 흐름은 유지하고, session/user/token response contract 검증만 전용 모듈로 이동했다.

## 변경 파일

- `src/api/cli-auth-response.ts`
  - `parseCliAuthSession`
  - `parseCliAuthExchangeResult`
  - CLI auth user/token/date field 검증
  - authorize URL trust 검증 유지
- `src/api/client.ts`
  - CLI auth parser 구현 제거
  - post/exchange orchestration만 유지

## 검증

### Targeted

```bash
npm run typecheck
npm test -- --run tests/api-hook.test.ts
```

결과: 1 file / 132 tests passed

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
  - `src/api/cli-auth-response.ts`: 104 pure LOC
  - `src/api/draft-upload-lock.ts`: 215 pure LOC
  - `src/api/client.ts`: 632 pure LOC

> [!warning]
> LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가했다. 대신 `npm run typecheck`, `npm run build`, targeted/full Vitest suite로 검증했다.

## 후행 과제

- `src/api/client.ts`는 계속 줄었지만 여전히 250 pure LOC 기준을 넘는다.
- 다음 분리 후보:
  - publish draft result parser / remote preview parser
  - cached upload reuse / duplicate ingestion reconciliation
  - network retry / timeout policy

## 배포

현재 goal 규칙상 서버/인프라/배포는 보류하므로 수행하지 않았다.
