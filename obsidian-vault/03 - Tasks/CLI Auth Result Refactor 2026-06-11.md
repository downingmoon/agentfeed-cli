---
title: CLI Auth Result Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/enterprise-audit
status: done
---

# CLI Auth Result Refactor 2026-06-11

## 목적

`agentfeed login`/`agentfeed rotate`는 인증 토큰 저장 여부, browser approval, JSON 출력, no-save 안내가 얽히는 CLI 핵심 UX다. 기존 `src/cli/index.ts`에는 command orchestration과 완료 메시지/next-action/JSON payload 조립이 함께 있어 변경 리스크가 누적되고 있었다.

이번 slice는 신규 기능을 추가하지 않고, auth completion result 계산을 순수 모듈로 분리해 CLI 출력 boundary와 인증 완료 contract 계산을 분리했다.

## 변경

- `src/cli/auth-result.ts` 추가.
  - `CredentialResultView`, `CredentialJsonView` 타입 정의.
  - `browserLoginCredentialResult()` / `tokenLoginCredentialResult()` / `rotateCredentialResult()` / `credentialJsonResult()` 분리.
  - 기존 next-action 차이를 보존:
    - browser login no-save: `agentfeed login`, `agentfeed status`.
    - token stdin no-save: `agentfeed status`.
    - saved login/rotate: `agentfeed status`, `agentfeed share --dry`.
- `src/cli/index.ts`는 credential result를 받아 출력하는 boundary와 command orchestration만 유지.
- `printWarningLines()` 입력을 readonly 배열로 좁혀 새 View 타입과 일치시킴.

## 검증

- `npm run build` 통과.
- `npx vitest run tests/cli-status-doctor.test.ts --reporter=verbose` 통과: 1 file / 37 tests.
- `npm test -- --run` 통과: 42 files / 623 tests.
- `git diff --check` 통과.
- 변경 TS 파일 hygiene grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, `: any`, `enum` 없음.
- LSP diagnostics는 현재 환경에 `typescript-language-server`가 설치되어 있지 않아 실행 불가. `tsc` build와 vitest를 대체 evidence로 사용.

## LOC 상태

- `src/cli/index.ts`: 약 3,350 pure LOC → 약 3,301 pure LOC.
- `src/cli/auth-result.ts`: 약 80 pure LOC.

## 후행 과제

> [!warning]
> `src/cli/index.ts`는 여전히 oversized entrypoint다. 다음 slice는 `publish`/upload preflight recovery message와 upload result next-action 계산을 분리하는 것이 좋다. 이는 사용자에게 오류와 복구 순서를 명확히 보여주는 enterprise 품질 목표와 직접 연결된다.

## 관련

- [[CLI Status Readiness Refactor 2026-06-11]]
- [[CLI Doctor Readiness Refactor 2026-06-11]]
- [[Active Tasks]]
