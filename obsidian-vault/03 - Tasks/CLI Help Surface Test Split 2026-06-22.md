---
title: CLI Help Surface Test Split 2026-06-22
aliases:
  - CLI help surface split
  - CLI command catalog help split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 8140522
---

# CLI Help Surface Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-help.test.ts`에서 command catalog, public command help surfaces, shell completion help/script coverage를 focused suites로 분리했다. 이전 recovery split 이후에도 남아 있던 `cli-help` oversized를 해소했고 원본과 신규 suites 모두 250 pure LOC ceiling 아래에 있다.

## 코드 커밋

- `8140522` — `Split CLI help surface tests`

## 변경 파일

- `tests/cli-help.test.ts`
- `tests/cli-commands-catalog.test.ts`
- `tests/cli-help-public-surfaces.test.ts`
- `tests/cli-completion-help.test.ts`

## 분리 범위

- `tests/cli-help.test.ts`
  - Root help output.
  - ANSI/no-color behavior.
  - Collect-specific help.
  - Natural help aliases.
  - Version command/global flag output.
- `tests/cli-commands-catalog.test.ts`
  - `agentfeed commands` human catalog.
  - `agentfeed commands --json` structured command/workflow/options contract.
- `tests/cli-help-public-surfaces.test.ts`
  - Example-driven help for review workflows.
  - Narrow-terminal readability for every public help surface.
  - `When to use:` guidance across public commands.
  - Command-specific help coverage plus login/rotate/logout safety guidance.
- `tests/cli-completion-help.test.ts`
  - `completion --help` install guidance.
  - zsh/bash/fish generated completion script contract.

## 검증 증거

- Baseline filter: 원본 `tests/cli-help.test.ts`에서 selected help-surface/completion filter 12 tests 통과.
- Split filter: `tests/cli-help.test.ts tests/cli-commands-catalog.test.ts tests/cli-help-public-surfaces.test.ts tests/cli-completion-help.test.ts` + 동일 filter — 12 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-help.test.ts tests/cli-commands-catalog.test.ts tests/cli-help-public-surfaces.test.ts tests/cli-completion-help.test.ts` — 4 files / 21 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 186 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: 신규 help suites에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-help.test.ts`: 184 pure LOC.
  - `tests/cli-commands-catalog.test.ts`: 139 pure LOC.
  - `tests/cli-help-public-surfaces.test.ts`: 185 pure LOC.
  - `tests/cli-completion-help.test.ts`: 89 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-help.test.ts` oversized는 해소됨.
- 현재 CLI 테스트 oversized scan 기준 다음 최대 후보는 `tests/cli-preview.test.ts` 464 pure LOC이고, 그 다음은 `tests/git-draft.test.ts` 401 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
