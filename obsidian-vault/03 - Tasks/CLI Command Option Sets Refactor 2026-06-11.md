---
title: CLI Command Option Sets Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/cli
  - enterprise-readiness
  - refactor
status: done
---

# CLI Command Option Sets Refactor 2026-06-11

> [!success]
> `validateCommandArgs`의 command option lookup set 구성 책임을 `buildCommandOptionSets`로 분리했다.

## 변경 범위

- `src/cli/command-option-sets.ts`
  - command-specific flags/value options를 parser lookup set으로 변환하는 focused helper 추가.
  - shared help aliases `--help`, `-h` 포함 정책을 helper에 고정.
- `src/cli/index.ts`
  - inline `new Set([...flags, '--help', '-h'])` / value option set 생성 제거.
  - `buildCommandOptionSets(spec)` 결과를 소비하도록 변경.
- `tests/command-option-sets.test.ts`
  - command-specific flags 보존, shared help aliases 포함, value option empty case를 behavior test로 잠금.

## 검증 evidence

- Red: `npx vitest run tests/command-option-sets.test.ts --reporter=verbose`
  - helper module 미존재로 실패 확인.
- Build: `npm run build` 통과.
- Focused: `npx vitest run tests/command-option-sets.test.ts tests/conflict-validation.test.ts tests/cli-help.test.ts --reporter=verbose`
  - 3 files, 42 tests 통과.
- CLI smoke: `node dist/cli/index.js status --help`
  - exit 0.
  - stdout에 `--help, -h` 표시 확인.
- Full: `npm test -- --run`
  - 56 files, 678 tests 통과.
- Hygiene:
  - `git diff --check` 통과.
  - strict escape-hatch grep 통과.
- LOC:
  - `src/cli/index.ts`: 2838 pure LOC, inherited oversized defect.
  - `src/cli/command-option-sets.ts`: 14 pure LOC.
  - `tests/command-option-sets.test.ts`: 16 pure LOC.
- LSP: `typescript-language-server` 미설치로 diagnostics 실행 불가.

## Enterprise constraints

- 서버/배포/infra/CICD 작업 없음.
- CLI-Frontend-Backend contract 변경 없음.
- 신규 기능 추가 없음.
- CLI help aliases acceptance behavior를 유지하면서 내부 책임만 축소.

## 다음 후보

- long option policy decision helper extraction.
- short/long option branch dispatch result type 도입.
- command arg spec query/helper split.
