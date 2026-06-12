---
title: CLI Hook Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Hook Output Split 2026-06-12

> [!success] 완료
> `agentfeed hook install/uninstall claude-code`의 JSON payload와 human-readable lifecycle rendering을 `src/cli/hook-output.ts`로 분리했다. Claude settings discovery/write/remove side effect는 `cmdHook`에 남기고 출력 계약만 helper로 이동했다.

## 변경 범위

- `src/cli/hook-output.ts`
  - `hookJsonPayload`로 install dry-run/install/uninstall JSON payload를 집중화했다.
  - `renderHookHumanLines`로 hook heading, lifecycle message, summary, backup, guided next action rendering을 집중화했다.
  - install-only `dry_run` field와 uninstall JSON shape를 discriminated input/output type으로 분리했다.
- `src/cli/index.ts`
  - `cmdHook`은 target validation, project resolution, config loading, hook install/uninstall execution만 유지하고 출력 조립을 helper에 위임한다.
- `tests/hook-output.test.ts`
  - dry-run install JSON, uninstall JSON, install human output, uninstall human output을 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/hook-output.test.ts --reporter=verbose` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/hook-output.test.ts tests/cli-init-hook.test.ts tests/api-hook.test.ts tests/cli-guidance-actions.test.ts --reporter=verbose` → 153 tests passed.
- Full suite: `npm test -- --run` → 89 files / 747 tests passed.
- 실제 CLI smoke:
  - temp project `agentfeed hook install claude-code --dry-run` human output에서 dry-run heading, summary, next action 확인 및 settings 파일 미생성 확인.
  - temp project `agentfeed hook install claude-code --dry-run --json` JSON에서 target/action/scope/dry_run/settings_path/backup_path/next_actions 확인.
  - temp project `agentfeed hook install claude-code` human output에서 installed heading, dry-run no, recommended order 확인.
  - temp project `agentfeed hook uninstall claude-code` human output에서 removed heading 및 status next action 확인.
  - temp project `agentfeed hook uninstall claude-code --json` JSON에서 uninstall shape 및 `dry_run` 미노출 확인.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1411, `src/cli/hook-output.ts` 100, `tests/hook-output.test.ts` 83.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in new helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 hook public behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1411 pure LOC)이므로 다음 slice에서도 command-specific output/helper 경계를 추가 분리한다.
- 후보: login/token auth result 출력 또는 doctor/status-adjacent diagnostics 출력 경계 추가 분리.
