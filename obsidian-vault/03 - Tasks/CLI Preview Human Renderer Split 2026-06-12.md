---
title: CLI Preview Human Renderer Split 2026-06-12
status: done
date: 2026-06-12
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
---

# CLI Preview Human Renderer Split 2026-06-12

## Summary

`agentfeed preview`와 `agentfeed preview --remote`의 human-readable line rendering을 `src/cli/preview-command.ts`로 분리했다. `cmdPreview`는 draft 선택, sanitization, credential/API preflight, remote preview side effect orchestration만 담당하고, local/remote human section 구성은 focused renderer가 담당한다.

## Behavior locked

- Local preview human output은 heading, summary/details sections, metrics wrapping, upload status, review URL block, recommended next actions를 유지한다.
- Remote preview human output은 remote validity, warnings, title fallback, guided next actions를 유지한다.
- JSON preview payload extraction과 remote API contract behavior는 변경하지 않았다.

## Verification

- Red test: `npx vitest run tests/preview-command.test.ts --reporter=verbose`가 renderer export 부재로 실패하는 것을 먼저 확인.
- Build: `npm run build` 통과.
- Focused tests: `npx vitest run tests/preview-command.test.ts tests/cli-preview.test.ts tests/cli-draft-next-actions.test.ts tests/cli-help.test.ts --reporter=verbose` → 4 files / 58 tests 통과.
- Full tests: `npm test -- --run` → 81 files / 725 tests 통과.
- CLI smoke: 임시 `.agentfeed` 프로젝트와 local HTTP API server로 `node dist/cli/index.js preview --id draft_preview` 및 `preview --id draft_preview --remote` 실행, local/remote human output과 server hit counts 확인.
- Static: `git diff --check`, strict grep, no-excuse checker 통과.
- LOC: `src/cli/preview-command.ts` 90 pure LOC, `tests/preview-command.test.ts` 115 pure LOC, `src/cli/index.ts` 1970 pure LOC.
- LSP: `typescript-language-server` 미설치/이전 declined 상태라 MCP LSP diagnostics는 실행 불가.

## Constraints

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 새 사용자 기능 추가 없음. 내부 preview human output boundary 분리와 테스트 고정만 수행.

## Follow-up

- `src/cli/index.ts`는 여전히 oversized inherited defect다. 다음 안전 slice 후보: publish/share result rendering 분리, privacy scan report rendering 분리, 또는 status/doctor output orchestration 분리.
