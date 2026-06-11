---
title: CLI Root Help Renderer Split 2026-06-12
aliases:
  - CLI root help renderer helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Root Help Renderer Split 2026-06-12

> [!summary]
> Root help 정적 섹션 렌더링을 `src/cli/root-help-renderer.ts`로 분리하고, `src/cli/index.ts`는 command catalog line 주입과 출력 orchestration만 담당하도록 축소했다.

## 변경

- `renderRootHelpLines` helper를 추가해 root help copy, version line, catalog injection, command-specific guidance 순서를 단위 테스트로 고정했다.
- `printHelp`는 `renderRootHelpLines` 결과를 출력하도록 변경했다.
- `printCommandCatalog`와 root help가 같은 `commandCatalogLines` helper를 공유하도록 정리했다.

## 검증

- Red: `tests/root-help-renderer.test.ts`가 `root-help-renderer` 모듈 부재로 실패함을 확인.
- Green: `npm run build` 통과.
- Focused: `npx vitest run tests/root-help-renderer.test.ts tests/cli-help.test.ts --reporter=verbose` 39 tests 통과.
- Full: `npm test -- --run` 74 files / 707 tests 통과.
- Smoke: `node dist/cli/index.js --help`에서 Usage, Global options, Quickstart, Headless login, Daily workflow, Draft review, Advanced and diagnostics, Shell completion, Commands, command-specific guidance 확인.
- Static: `git diff --check`, no-excuse checker, strict grep 통과.
- LSP: `typescript-language-server` 미설치로 실행 불가.

## 범위 제한

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 feature 없음. Public CLI help output은 유지하고 내부 렌더링 경계만 분리했다.
