---
title: CLI Open Payload Split 2026-06-12
status: done
date: 2026-06-12
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
---

# CLI Open Payload Split 2026-06-12

## Summary

`agentfeed open --json`의 machine-readable review URL payload 조립을 `src/cli/open-command.ts`로 분리했다. `cmdOpen`은 draft 선택, trusted review URL 검증, browser open side effect orchestration을 계속 담당하고, JSON shape(`draft_id`, `review_url`, `opened`, `warnings`, `next_actions`) 조립은 focused helper가 담당한다.

## Behavior locked

- `opened: true` payload가 review URL과 next actions를 유지한다.
- browser 자동 open 실패 시 `opened: false`와 manual-open warning을 JSON payload에 보존한다.
- 기존 `agentfeed open` human output과 trusted URL validation 흐름은 변경하지 않았다.

## Verification

- Red test: `npx vitest run tests/open-command.test.ts --reporter=verbose`가 helper 미존재로 실패하는 것을 먼저 확인.
- Build: `npm run build` 통과.
- Focused tests: `npx vitest run tests/open-command.test.ts tests/cli-drafts.test.ts tests/cli-draft-navigation-actions.test.ts tests/cli-help.test.ts --reporter=verbose` → 4 files / 60 tests 통과.
- Full tests: `npm test -- --run` → 80 files / 721 tests 통과.
- CLI smoke: 임시 `.agentfeed` 프로젝트와 fake `open` binary로 `node dist/cli/index.js open --id draft_open --json` 실행, `opened=true`, review URL, next actions, fake browser handoff 확인.
- Static: `git diff --check`, strict grep, no-excuse checker 통과.
- LOC: `src/cli/open-command.ts` 23 pure LOC, `tests/open-command.test.ts` 32 pure LOC, `src/cli/index.ts` 1993 pure LOC.
- LSP: `typescript-language-server` 미설치/이전 declined 상태라 MCP LSP diagnostics는 실행 불가.

## Constraints

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 새 사용자 기능 추가 없음. 내부 출력 경계 분리와 테스트 고정만 수행.

## Follow-up

- `src/cli/index.ts`는 여전히 oversized inherited defect다. 다음 안전 slice 후보: `agentfeed open` human success/manual fallback line rendering 분리 또는 `preview --json` payload boundary 분리.
