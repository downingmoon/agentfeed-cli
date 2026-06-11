---
title: CLI Value Option Consumption Refactor 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/cli
  - refactor
  - enterprise-readiness
---

# CLI Value Option Consumption Refactor 2026-06-11

> [!success] 결론
> value option의 inline/separate value 소비와 missing-value rejection을 `consumeValueOption` helper로 분리했다. `validateCommandArgs`는 option 식별과 command policy 흐름에 집중하고, value token 소비는 typed result(`nextIndex`)로 받는다.

## 변경 파일

- `src/cli/value-option-consumption.ts`
  - inline value는 현재 index 유지.
  - separate value는 다음 index로 advance.
  - empty inline value, 누락된 value, flag-shaped next token은 기존 recovery message로 reject.
- `src/cli/index.ts`
  - value option branch에서 inline value 직접 검사와 `i += 1`을 제거.
  - `consumeValueOption(...).nextIndex`로 index 이동 결정을 받도록 변경.
- `tests/value-option-consumption.test.ts`
  - inline/separate/missing/empty/flag-shaped value cases를 unit test로 고정.

## 검증

- Red: `npx vitest run tests/value-option-consumption.test.ts --reporter=verbose`
  - helper 파일 미존재로 실패 확인.
- Green/focused:
  - `npm run build` 통과.
  - `npx vitest run tests/value-option-consumption.test.ts tests/long-option-token.test.ts tests/cli-help.test.ts --reporter=verbose` 통과: 42 tests.
- CLI smoke:
  - `node dist/cli/index.js login --api-base-url --json` → exit 1.
  - JSON error: `api_base_url_requires_a_value`, message `--api-base-url requires a value.`
- Full regression:
  - `npm test -- --run` 통과: 52 files, 668 tests.
- Hygiene:
  - `git diff --check` 통과.
  - strict escape-hatch grep 통과.
  - LOC: `src/cli/value-option-consumption.ts` 20, `tests/value-option-consumption.test.ts` 32.
  - `src/cli/index.ts`는 inherited oversized defect(2841 pure LOC)이나 이번 slice에서 value-option 소비 책임을 더 작은 module로 분리해 감소 방향을 유지했다.
- LSP:
  - MCP LSP diagnostics는 `typescript-language-server` 미설치로 실행 불가.

## 경계

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 추가 없음.

## 다음 후보

- flag value rejection branch extraction.
- command arg spec query/helper split.
- positional validation branch extraction.
