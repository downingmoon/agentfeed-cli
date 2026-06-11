---
title: CLI Version Command Split 2026-06-12
aliases:
  - CLI version command helper split
status: done
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - enterprise-readiness
updated: 2026-06-12
---

# CLI Version Command Split 2026-06-12

> [!summary]
> `agentfeed version`의 plain/JSON stdout 결정 로직을 `src/cli/version-command.ts`로 분리해 `src/cli/index.ts`의 version command wrapper 책임을 줄였다.

## 변경
- `versionCommandOutput` helper를 추가해 기본 version 출력과 `--json` machine-readable 출력 계약을 테스트로 고정했다.
- `cmdVersion`은 helper 결과를 stdout으로 연결하는 orchestration만 담당하도록 축소했다.
- `flag` helper는 mutation을 하지 않으므로 `readonly string[]` 입력을 허용해 command helper들이 불필요한 배열 복사 없이 사용할 수 있게 했다.

## 검증
- Red: `tests/version-command.test.ts`가 `version-command` 모듈 부재로 실패함을 확인.
- Green: `npm run build` 통과.
- Focused: `npx vitest run tests/version-command.test.ts tests/cli-help.test.ts tests/version.test.ts --reporter=verbose` 45 tests 통과.
- Full: `npm test -- --run` 78 files / 717 tests 통과.
- Smoke: `node dist/cli/index.js version`, `--version`, `-v`, `version --json`이 `package.json` version과 일치함을 확인.
- Static: `git diff --check`, no-excuse checker, strict grep 통과.
- LSP: `typescript-language-server` 미설치로 실행 불가.

## 범위 제한
- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 feature 없음. `agentfeed version` observable behavior는 유지하고 내부 command output boundary만 분리했다.

## 후행 과제
- `src/cli/index.ts`는 여전히 2009 pure LOC로 과대하다. 다음 safe slice는 drafts list/open/discard command orchestration 중 순수 decision/output helper를 테스트로 고정해 분리하는 것이다.
