---
title: CLI Guided Next Command Renderer Split 2026-06-12
aliases:
  - CLI guided next command renderer helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Guided Next Command Renderer Split 2026-06-12

> [!summary]
> CLI next-action command line rendering을 `src/cli/guided-next-command-renderer.ts`로 분리해 `src/cli/index.ts`의 shared presentation utility 책임을 줄였다.

## 변경

- `uniqueNextCommands`, `renderNextCommandLines`, `renderRecommendedCommandLines`, `renderGuidedNextCommandLines` helper를 추가했다.
- `index.ts`의 `printNextCommands`, `printRecommendedCommands`, `printGuidedNextCommands`는 renderer helper 결과를 출력만 하도록 축소했다.
- 단일 next command 출력과 다중 recommended-order 출력 계약을 단위 테스트로 고정했다.

## 검증

- Red: `tests/guided-next-command-renderer.test.ts`가 `guided-next-command-renderer` 모듈 부재로 실패함을 확인.
- Green: `npm run build` 통과.
- Focused: `npx vitest run tests/guided-next-command-renderer.test.ts tests/cli-help.test.ts tests/status-readiness.test.ts --reporter=verbose` 41 tests 통과.
- Full: `npm test -- --run` 75 files / 710 tests 통과.
- Smoke: `node dist/cli/index.js commands`에서 Guided workflows, Try this, Recommended order, command-specific guidance 확인. `node dist/cli/index.js --help`에서 Commands 및 root command-specific guidance 확인.
- Static: `git diff --check`, no-excuse checker, strict grep 통과.
- LSP: `typescript-language-server` 미설치로 실행 불가.

## 범위 제한

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 feature 없음. CLI output shape은 유지하고 shared renderer boundary만 분리했다.

## 후행 과제

- `src/cli/index.ts`는 여전히 2016 pure LOC로 과대하다. 다음 safe slice는 `cmdCommands` JSON/human view 조립 또는 completion command wrapper를 helper로 분리하는 것이다.
