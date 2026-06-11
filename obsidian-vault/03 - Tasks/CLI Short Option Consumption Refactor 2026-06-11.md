---
title: CLI Short Option Consumption Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - enterprise-readiness
---

# CLI Short Option Consumption Refactor 2026-06-11

> [!success] 결론
> short option(`-h` 등)의 known-flag consumption 결정을 `consumeShortOption`으로 분리했다. unknown option recovery message는 기존 `unknownOptionError` 계약을 유지하되, `validateCommandArgs` 내부의 short flag membership branch를 option-consumption boundary로 이동했다.

## 변경 파일

- `src/cli/option-consumption.ts`
  - `consumeShortOption` 추가.
  - known short flag는 `{ optionName }`으로 반환.
  - unknown short option은 caller가 제공한 기존 recovery `Error`를 throw.
- `src/cli/index.ts`
  - `raw.startsWith('-')` branch의 inline `flags.has(raw)` 분기를 제거.
  - `optionRequiresValueMessage` unused import 제거.
- `tests/flag-option-consumption.test.ts`
  - known short flag accept와 unknown short option rejection을 unit test로 고정.

## 검증

- Red: `npx vitest run tests/flag-option-consumption.test.ts --reporter=verbose`
  - `consumeShortOption is not a function`으로 실패 확인.
- Green/focused:
  - `npm run build` 통과.
  - `npx vitest run tests/flag-option-consumption.test.ts tests/value-option-consumption.test.ts tests/long-option-token.test.ts tests/cli-help.test.ts --reporter=verbose` 통과: 46 tests.
- CLI smoke:
  - `node dist/cli/index.js status -x` → exit 1.
  - stderr: `Unknown option: -x`, `Did you mean: -h`, `Run: agentfeed status --help`.
- Full regression:
  - `npm test -- --run` 통과: 53 files, 672 tests.
- Hygiene:
  - `git diff --check` 통과.
  - strict escape-hatch grep 통과.
  - LOC: `src/cli/index.ts` 2838, `src/cli/option-consumption.ts` 44, `tests/flag-option-consumption.test.ts` 18.
- LSP:
  - MCP LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가.

## 경계

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 추가 없음.

## 다음 후보

- positional accumulation/validation branch extraction.
- long option policy decision helper extraction.
- command arg spec query/helper split.
