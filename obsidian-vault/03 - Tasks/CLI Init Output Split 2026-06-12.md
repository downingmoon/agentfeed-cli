---
title: CLI Init Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Init Output Split 2026-06-12

> [!success] 완료
> `agentfeed init`의 JSON payload와 human-readable setup checklist rendering을 `src/cli/init-output.ts`로 분리했다. Project initialization, config backup, git-check side effect는 `cmdInit`에 남기고 출력 계약만 helper로 이동했다.

## 변경 범위

- `src/cli/init-output.ts`
  - `initJsonPayload`로 `init --json`의 project/config/backup/checklist/next action payload를 집중화했다.
  - `renderInitHumanLines`로 heading, summary, project-relative backup path, setup checklist, next action rendering을 집중화했다.
  - `initSetupChecklist`로 fresh/already-initialized checklist wording을 command orchestration 밖에서 테스트 가능하게 했다.
- `src/cli/index.ts`
  - `cmdInit`은 init execution과 flag parsing만 유지하고 JSON/human output assembly를 helper에 위임한다.
  - init 전용 `projectRelativePath`와 checklist print helper를 제거했다.
- `tests/init-output.test.ts`
  - JSON payload, relative backup path, state-specific human output, setup checklist order를 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/init-output.test.ts --reporter=verbose` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/init-output.test.ts tests/cli-init-setup-ux.test.ts tests/config.test.ts tests/cli-guidance-actions.test.ts --reporter=verbose` → 57 tests passed.
- Full suite: `npm test -- --run` → 88 files / 743 tests passed.
- 실제 CLI smoke:
  - temp project `agentfeed init --no-git-check --project-name smoke-init` human output에서 initialized heading, project name, setup checklist, login next action 확인.
  - temp project `agentfeed init --no-git-check --project-name ignored --json` JSON에서 already-initialized 상태, 기존 project name, force next action, reinitialize checklist 확인.
  - temp project `agentfeed init --no-git-check --project-name forced-init --force` human output에서 reinitialized heading, Backups section, project-relative backup path 확인 및 absolute temp backup path 미노출 확인.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1437, `src/cli/init-output.ts` 119, `tests/init-output.test.ts` 88.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in new helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 init public behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1437 pure LOC)이므로 다음 slice에서도 command-specific output/helper 경계를 추가 분리한다.
- 후보: 남은 command-specific output/helper 경계를 실제 public command 기준으로만 분리.
