---
title: CLI Discard Payload Split 2026-06-12
aliases:
  - CLI discard command JSON payload split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Discard Payload Split 2026-06-12

> [!summary]
> `agentfeed discard`의 confirmation/complete JSON payload 조립을 `src/cli/discard-command.ts`로 분리해 `src/cli/index.ts`의 discard command wrapper 책임을 줄였다.

## 변경
- `discardConfirmationPayload` helper를 추가해 `--json` confirmation-required 응답의 `confirmation_required`, `deleted`, file removal preview, `next_actions` 계약을 고정했다.
- `discardCompletePayload` helper를 추가해 `--yes --json` 완료 응답의 deletion summary와 후속 action 계약을 고정했다.
- `cmdDiscard`는 draft path 존재 확인, 삭제 side effect, human output orchestration을 계속 담당하고 JSON payload 조립만 helper에 위임한다.

## 검증
- Red: `tests/discard-command.test.ts`가 `discard-command` 모듈 부재로 실패함을 확인.
- Green: `npm run build` 통과.
- Focused: `npx vitest run tests/discard-command.test.ts tests/cli-drafts.test.ts tests/cli-draft-navigation-actions.test.ts tests/cli-help.test.ts --reporter=verbose` 60 tests 통과.
- Full: `npm test -- --run` 79 files / 719 tests 통과.
- Smoke: 실제 temp project에서 `agentfeed init --no-git-check`, `discard --id draft_smoke --json`, `discard --id draft_smoke --yes --json` 실행 후 confirmation payload와 file deletion을 확인.
- Static: `git diff --check`, no-excuse checker, strict grep 통과.
- LSP: `typescript-language-server` 미설치로 실행 불가.

## 범위 제한
- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 feature 없음. `agentfeed discard` observable behavior는 유지하고 내부 JSON payload boundary만 분리했다.

## 후행 과제
- `src/cli/index.ts`는 여전히 1992 pure LOC로 과대하다. 다음 safe slice는 `open` command의 trusted URL result/output payload 또는 `drafts` list human renderer boundary를 테스트로 고정해 분리하는 것이다.
