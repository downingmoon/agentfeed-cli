---
title: CLI Collect Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Collect Output Split 2026-06-12

> [!success] 완료
> `agentfeed collect`의 JSON payload와 human-readable draft report rendering을 `src/cli/collect-output.ts`로 분리했다. Draft collection, optional upload, cursor persistence side effect는 `cmdCollect`에 남기고 출력 계약만 helper로 이동했다.

## 변경 범위

- `src/cli/collect-output.ts`
  - `collectJsonPayload`로 `collect --json`의 draft + warnings + next actions payload를 집중화했다.
  - `renderCollectHumanLines`로 heading, warnings, summary, signals, explain collection, next action rendering을 집중화했다.
  - `renderCollectAutoUploadIgnoredWarningLines`로 `collection.auto_upload` safety warning wording을 집중화했다.
- `src/cli/index.ts`
  - `cmdCollect`은 collection/upload/cursor orchestration만 유지하고 출력 조립을 helper에 위임한다.
- `tests/collect-output.test.ts`
  - JSON payload, warning aggregation, next action, human report sections, dry-run/explain rendering을 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/collect-output.test.ts --reporter=verbose` → helper 모듈 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/collect-output.test.ts tests/cli-share.test.ts tests/share.test.ts tests/duplicate-draft.test.ts tests/cli-draft-next-actions.test.ts --reporter=verbose` → 82 tests passed.
- Full suite: `npm test -- --run` → 87 files / 739 tests passed.
- 실제 CLI smoke:
  - temp git project `agentfeed collect --source codex --session-file ... --all --no-save-cursor --explain` human output에서 ready heading, Summary, Signals, model, collection quality, preview next action 확인.
  - temp git project `agentfeed collect --json --source codex --session-file ... --all --force --no-save-cursor` JSON에서 draft id, agent, warnings array, next actions 확인.
  - 초기 smoke 스크립트의 `agentfeed init --name`은 실제 CLI 옵션이 아니어서 실패했고, 실제 `agentfeed init` surface로 재실행해 통과했다.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1491, `src/cli/collect-output.ts` 89, `tests/collect-output.test.ts` 65.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in new helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 collect public behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1491 pure LOC)이므로 다음 slice에서도 command-specific output/helper 경계를 추가 분리한다.
- 후보: 남은 command-specific output/helper 경계 중 `init` 출력 경계 분리.
