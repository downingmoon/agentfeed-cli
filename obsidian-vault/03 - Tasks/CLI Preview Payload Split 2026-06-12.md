---
title: CLI Preview Payload Split 2026-06-12
status: done
date: 2026-06-12
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
---

# CLI Preview Payload Split 2026-06-12

## Summary

`agentfeed preview --json`와 `agentfeed preview --remote --json`의 machine-readable payload 조립을 `src/cli/preview-command.ts`로 분리했다. `cmdPreview`는 draft 선택, sanitization, credential/API preflight, remote preview side effect orchestration을 계속 담당하고, local/remote JSON shape와 `next_actions` 부착은 focused helper가 담당한다.

## Behavior locked

- Local preview JSON은 sanitized draft fields를 보존하고 pending/uploaded state에 맞는 `next_actions`를 붙인다.
- Remote preview JSON은 backend remote preview contract fields(`valid`, `preview`, `warnings`)를 보존하고 remote validity에 맞는 `next_actions`를 붙인다.
- Human-readable preview output과 API metadata/remote preview 호출 흐름은 변경하지 않았다.

## Verification

- Red test: `npx vitest run tests/preview-command.test.ts --reporter=verbose`가 helper 미존재로 실패하는 것을 먼저 확인.
- Build: `npm run build` 통과.
- Focused tests: `npx vitest run tests/preview-command.test.ts tests/cli-preview.test.ts tests/cli-draft-next-actions.test.ts tests/cli-help.test.ts --reporter=verbose` → 4 files / 56 tests 통과.
- Full tests: `npm test -- --run` → 81 files / 723 tests 통과.
- CLI smoke: 임시 `.agentfeed` 프로젝트와 local HTTP API server로 `node dist/cli/index.js preview --id draft_preview --json` 및 `preview --id draft_preview --remote --json` 실행, local/remote payload와 server hit counts 확인.
- Static: `git diff --check`, strict grep, no-excuse checker 통과.
- LOC: `src/cli/preview-command.ts` 23 pure LOC, `tests/preview-command.test.ts` 46 pure LOC, `src/cli/index.ts` 1994 pure LOC.
- LSP: `typescript-language-server` 미설치/이전 declined 상태라 MCP LSP diagnostics는 실행 불가.

## Constraints

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 새 사용자 기능 추가 없음. 내부 preview JSON payload boundary 분리와 테스트 고정만 수행.

## Follow-up

- `src/cli/index.ts`는 여전히 oversized inherited defect다. 다음 안전 slice 후보: preview human line rendering 분리, publish/share JSON payload boundary 분리, 또는 credential/status command orchestration 분리.
