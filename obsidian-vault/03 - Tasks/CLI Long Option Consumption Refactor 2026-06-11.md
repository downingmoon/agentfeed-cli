---
title: CLI Long Option Consumption Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - enterprise-readiness
  - refactor
status: done
---

# CLI Long Option Consumption Refactor 2026-06-11

> [!success]
> `validateCommandArgs`의 long-option value/flag/unknown dispatch와 consumption 책임을 `classifyLongOption` / `consumeLongOption`으로 분리했다.

## 변경 범위

- `src/cli/long-option-classification.ts`
  - long option name을 `value` / `flag` / `unknown` discriminated union으로 분류.
  - value option 우선순위를 기존 `validateCommandArgs`와 동일하게 유지.
- `src/cli/long-option-consumption.ts`
  - parsed long option token을 받아 value/flag consumption 또는 unknown error throw를 수행.
  - `option-consumption.ts`의 기존 value/flag behavior를 재사용.
- `src/cli/index.ts`
  - inline long-option dispatch branch 제거.
  - `consumeLongOption` result로 `seenOptions`와 `nextIndex`만 반영.
- `tests/long-option-classification.test.ts`, `tests/long-option-consumption.test.ts`
  - value/flag/unknown long-option paths를 behavior test로 잠금.

## 검증 evidence

- Red:
  - `npx vitest run tests/long-option-classification.test.ts --reporter=verbose` helper module 미존재 실패 확인.
  - `npx vitest run tests/long-option-consumption.test.ts --reporter=verbose` helper module 미존재 실패 확인.
- Build: `npm run build` 통과.
- Focused: `npx vitest run tests/long-option-classification.test.ts tests/long-option-consumption.test.ts tests/long-option-token.test.ts tests/value-option-consumption.test.ts tests/flag-option-consumption.test.ts tests/cli-help.test.ts --reporter=verbose`
  - 6 files, 50 tests 통과.
- CLI smoke:
  - `node dist/cli/index.js login --api-base-url=https://api.example.test --json` → inline value option path 유지.
  - `node dist/cli/index.js status --json=true` → flag inline-value rejection 유지.
  - `node dist/cli/index.js share --opne-review` → unknown option suggestion 유지.
- Full: `npm test -- --run`
  - 58 files, 682 tests 통과.
- Hygiene:
  - `git diff --check` 통과.
  - strict escape-hatch grep 통과.
- LOC:
  - `src/cli/index.ts`: 2831 pure LOC, inherited oversized defect이며 이번 slice에서 7 LOC 감소.
  - `src/cli/long-option-classification.ts`: 14 pure LOC.
  - `src/cli/long-option-consumption.ts`: 42 pure LOC.
  - `tests/long-option-classification.test.ts`: 16 pure LOC.
  - `tests/long-option-consumption.test.ts`: 38 pure LOC.
- LSP: `typescript-language-server` 미설치로 diagnostics 실행 불가.

## Enterprise constraints

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 추가 없음.
- Long-option recovery 문구와 exit behavior는 기존과 동일하게 유지.

## 다음 후보

- short option branch helper extraction.
- positional accumulation helper extraction.
- command arg spec query/helper split.
