---
title: CLI Discard Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Discard Output Split 2026-06-12

> [!success] 완료
> `agentfeed discard`의 confirmation 및 confirmed-delete human-readable rendering을 `src/cli/discard-command.ts`로 분리했다. Draft id resolution, private draft file existence checks, file deletion side effect는 `cmdDiscard`에 남기고 출력 조립만 helper로 이동했다.

## 변경 범위

- `src/cli/discard-command.ts`
  - `renderDiscardConfirmationHumanLines`로 explicit confirmation 전 pause output을 집중화했다.
  - `renderDiscardCompleteHumanLines`로 confirmed deletion summary와 next action rendering을 집중화했다.
  - 기존 confirmation/complete JSON payload와 같은 command-specific boundary에 discard 출력 계약을 모았다.
- `src/cli/index.ts`
  - `cmdDiscard`은 draft id/path resolution, missing draft handling, JSON mode branching, actual file deletion만 유지하고 human rendering을 helper에 위임한다.
  - discard confirmation 전용 print helper와 complete 출력 중복을 제거했다.
- `tests/discard-command.test.ts`
  - 기존 JSON payload 계약에 더해 confirmation/complete human output을 순수 단위 테스트로 고정했다.

## 검증

- Red test 확인: `npx vitest run tests/discard-command.test.ts --reporter=verbose` → renderer export 부재로 실패.
- Green/focused:
  - `npm run build`
  - `npx vitest run tests/discard-command.test.ts tests/cli-drafts.test.ts tests/cli-draft-navigation-actions.test.ts --reporter=verbose` → 3 files / 24 tests passed.
- Full suite: `npm run build && npm test -- --run` → 91 files / 756 tests passed.
- 실제 CLI smoke:
  - temp project에 local draft를 생성하고 `agentfeed discard --id draft_discard_smoke` human confirmation output 및 파일 보존 확인.
  - `agentfeed discard --id draft_discard_smoke --json` JSON confirmation shape 및 파일 보존 확인.
  - `agentfeed discard --id draft_discard_smoke --yes` human complete output 및 JSON/Markdown draft file 삭제 확인.
- 정적 검증:
  - `git diff --check`
  - pure LOC: `src/cli/index.ts` 1277, `src/cli/discard-command.ts` 100, `tests/discard-command.test.ts` 71.
  - strict grep: no `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion pattern in changed helper/test.
  - no-excuse TypeScript checker: no violations in changed TS files.
- LSP: `typescript-language-server` 미설치 및 이전 declined 상태로 실행 불가.

## 배포/인프라

- 서버 배포, infra, CICD 변경 없음.
- CLI-Frontend-Backend 계약 변경 없음. 기존 `agentfeed discard` public behavior 유지.

## 다음 후보

- `src/cli/index.ts`가 여전히 oversized(1277 pure LOC)이므로 다음 slice에서도 command-specific orchestration/output 경계를 추가 분리한다.
- 후보: `open` draft-resolution error messages를 helper로 이동하거나 `publish/share` confirmation-adjacent output 경계를 더 줄인다.
