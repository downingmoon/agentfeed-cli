---
title: CLI Flag Option Consumption Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - enterprise-readiness
---

# CLI Flag Option Consumption Refactor 2026-06-11

> [!success] 결론
> flag option의 inline value rejection(`--flag=value`)을 `consumeFlagOption`으로 분리했다. 기존 value option helper는 `option-consumption` module로 이동해 long-option token 이후의 option 소비 책임을 한 곳에서 다룬다.

## 변경 파일

- `src/cli/option-consumption.ts`
  - 기존 `consumeValueOption` 유지.
  - 신규 `consumeFlagOption` 추가.
  - flag에 inline value가 붙으면 기존 `optionDoesNotAcceptValueMessage` recovery로 reject.
- `src/cli/index.ts`
  - `validateCommandArgs`의 flag branch에서 inline value 직접 검사를 제거.
  - value/flag option consumption helper를 같은 module에서 import.
- `tests/flag-option-consumption.test.ts`
  - flag accept/reject cases를 unit test로 고정.
- `tests/value-option-consumption.test.ts`
  - renamed `option-consumption` module import로 갱신.

## 검증

- Red: `npx vitest run tests/flag-option-consumption.test.ts --reporter=verbose`
  - helper 파일 미존재로 실패 확인.
- Green/focused:
  - `npm run build` 통과.
  - `npx vitest run tests/flag-option-consumption.test.ts tests/value-option-consumption.test.ts tests/long-option-token.test.ts tests/cli-help.test.ts --reporter=verbose` 통과: 44 tests.
- CLI smoke:
  - `node dist/cli/index.js status --json=true` → exit 1.
  - stderr: `--json does not accept a value.` / `Run: agentfeed status --help`.
- Full regression:
  - `npm test -- --run` 통과: 53 files, 670 tests.
- Hygiene:
  - `git diff --check` 통과.
  - strict escape-hatch grep 통과.
  - LOC: `src/cli/option-consumption.ts` 32, `tests/flag-option-consumption.test.ts` 10, `tests/value-option-consumption.test.ts` 32.
  - `src/cli/index.ts`는 inherited oversized defect(2841 pure LOC)이나 이번 slice에서 flag value rejection 책임을 더 작은 module로 분리했고 index LOC 증가 없이 유지했다.
- LSP:
  - MCP LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가.

## 경계

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 추가 없음.

## 다음 후보

- short flag handling branch extraction.
- positional accumulation/validation branch extraction.
- command arg spec query/helper split.
