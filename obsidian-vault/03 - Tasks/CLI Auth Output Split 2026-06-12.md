---
title: CLI Auth Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Auth Output Split 2026-06-12

> [!success] 완료
> `agentfeed login` 및 `agentfeed rotate`의 credential result human-readable rendering을 `src/cli/auth-output.ts`로 분리했다. Browser login, token stdin parsing, credential save/no-save, token rotation side effect는 command orchestration에 남기고 출력 line assembly만 helper로 이동했다.

## 변경 범위

- `src/cli/auth-output.ts`
  - `renderCredentialResultLines`로 heading, message, summary, token expiry, warnings, next action rendering을 집중화했다.
  - no-save credential persistence guidance를 helper에서 일관되게 출력하도록 고정했다.
- `src/cli/index.ts`
  - `printCredentialResult`를 제거하고 login/token/rotate 결과 출력은 `printLines(renderCredentialResultLines(...))`로 위임한다.
- `tests/auth-output.test.ts`
  - saved credential result와 no-save credential result human output을 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/auth-output.test.ts --reporter=verbose` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/auth-output.test.ts tests/cli-status-doctor.test.ts tests/config.test.ts tests/api-hook.test.ts --reporter=verbose` → 207 tests passed.
- Full suite: `npm test -- --run` → 90 files / 749 tests passed.
- 실제 CLI smoke:
  - temp HOME `printf %s "$TOKEN" | agentfeed login --token-stdin --no-save --api-base-url http://localhost:8123/v1` human output에서 not-saved heading, summary, API, no-save guidance, status next action 확인.
  - same command with `--json`에서 `saved=false`, API base, next action 확인.
  - human/JSON output 및 HOME credentials file에 smoke token 미노출/미저장 확인.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1390, `src/cli/auth-output.ts` 38, `tests/auth-output.test.ts` 54.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in new helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 login/rotate public behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1390 pure LOC)이므로 다음 slice에서도 command-specific output/helper 경계를 추가 분리한다.
- 후보: doctor human/JSON output orchestration 또는 copy/open review URL helper 경계 분리.
