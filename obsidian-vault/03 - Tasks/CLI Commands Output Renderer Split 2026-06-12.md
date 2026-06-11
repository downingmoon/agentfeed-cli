---
title: CLI Commands Output Renderer Split 2026-06-12
aliases:
  - CLI commands output renderer helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Commands Output Renderer Split 2026-06-12

> [!summary]
> `agentfeed commands` JSON payload와 human-readable output 조립 책임을 `src/cli/commands-output-renderer.ts`로 분리해 `src/cli/index.ts`의 command catalog presentation 책임을 줄였다.

## 변경

- `buildCommandsJsonPayload` helper를 추가해 next actions, workflows, grouped commands, explicit usage override를 한곳에서 조립하도록 했다.
- `renderCommandsHumanLines` helper를 추가해 heading, command catalog, guided workflows, Try this, command-specific guidance 출력 순서를 테스트로 고정했다.
- `cmdCommands`는 JSON/human output helper 호출과 출력만 담당하도록 축소했다.
- `RenderCommandCatalogGroup`에 command-name generic을 추가해 public command metadata 타입을 유지하며 helper로 전달할 수 있게 했다.

## 검증

- Red: `tests/commands-output-renderer.test.ts`가 `commands-output-renderer` 모듈 부재로 실패함을 확인.
- Green: `npm run build` 통과.
- Focused: `npx vitest run tests/commands-output-renderer.test.ts tests/cli-help.test.ts --reporter=verbose` 40 tests 통과.
- Full: `npm test -- --run` 76 files / 712 tests 통과.
- Smoke: `node dist/cli/index.js commands`에서 AgentFeed commands, Guided workflows, Try this, Recommended order, command-specific guidance 확인.
- Smoke: `node dist/cli/index.js commands --json`에서 `next_actions`, `Daily share` workflow, `completion` usage override 확인.
- Smoke: `node dist/cli/index.js --help`에서 root command catalog guidance 확인.
- Static: `git diff --check`, no-excuse checker, strict grep 통과.
- LSP: `typescript-language-server` 미설치로 실행 불가.

## 범위 제한

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 feature 없음. `agentfeed commands` observable output은 유지하고 내부 조립 경계만 분리했다.

## 후행 과제

- `src/cli/index.ts`는 여전히 2012 pure LOC로 과대하다. 다음 safe slice는 `completionScript`/`cmdCompletion` shell handling 또는 version command output wrapper를 helper로 분리하는 것이다.
