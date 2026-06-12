---
title: CLI Logout Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Logout Output Split 2026-06-12

> [!success] 완료
> `agentfeed logout`의 JSON payload, security checklist, human output rendering을 `src/cli/logout-output.ts`로 분리했다. Credential deletion side effect는 `cmdLogout`에 남기고 출력 계약만 helper로 이동했다.

## 변경 범위

- `src/cli/logout-output.ts`
  - `logoutJsonPayload`로 `logout --json` 계약을 집중화했다.
  - `renderLogoutHumanLines`로 human-readable summary, warning, security checklist, next action rendering을 집중화했다.
  - environment token warning과 checklist wording을 단일 상수/경계에서 유지한다.
- `src/cli/index.ts`
  - `cmdLogout`은 `deleteSavedCredentials()`와 `AGENTFEED_TOKEN` 환경 확인만 수행하고 출력은 helper에 위임한다.
- `tests/logout-output.test.ts`
  - JSON payload, warning aggregation, checklist order, human output, no-warning clean state를 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/logout-output.test.ts --reporter=verbose` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/logout-output.test.ts tests/cli-status-doctor.test.ts tests/config.test.ts --reporter=verbose` → 76 tests passed.
- Full suite: `npm test -- --run` → 86 files / 737 tests passed.
- 실제 CLI smoke:
  - temp HOME `agentfeed logout` human output: 완료 문구, credentials removed, `agentfeed status` next action 확인, saved token 비노출 확인.
  - temp HOME `agentfeed logout --json` with active `AGENTFEED_TOKEN`: `credentials_file_deleted`, `environment_token_active`, warning, checklist, next action 확인, saved/env token 비노출 확인.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1518, `src/cli/logout-output.ts` 106, `tests/logout-output.test.ts` 62.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in new/changed helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 logout public behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1518 pure LOC)이므로 다음 slice에서도 command-specific output/helper 경계를 추가 분리한다.
