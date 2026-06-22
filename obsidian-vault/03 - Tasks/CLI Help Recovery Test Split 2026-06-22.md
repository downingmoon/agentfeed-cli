---
title: CLI Help Recovery Test Split 2026-06-22
aliases:
  - CLI help recovery split
  - CLI help argument validation split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: f84ec6b
---

# CLI Help Recovery Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-help.test.ts`에서 option validation/recovery coverage와 argument validation recovery coverage를 focused suites로 분리했다. 원본은 아직 oversized지만 688 pure LOC에서 479 pure LOC로 낮아졌고, 새 suites는 250 pure LOC ceiling 아래에 있다.

## 코드 커밋

- `f84ec6b` — `Split CLI help recovery tests`

## 변경 파일

- `tests/cli-help.test.ts`
- `tests/cli-help-recovery.test.ts`
- `tests/cli-help-argument-validation.test.ts`

## 분리 범위

- `tests/cli-help-recovery.test.ts`
  - Unknown option JSON/human recovery.
  - Leading/global-looking option command-first guidance.
  - Unknown command/help-topic typo suggestions.
  - Close option typo suggestions.
  - Hook missing/unsupported target recovery.
- `tests/cli-help-argument-validation.test.ts`
  - Positional argument to dashed-flag suggestions.
  - Missing option value guidance.
  - Token alias/completion subcommand recovery.
  - Hook action/target corrections.
  - Command-specific conflicting flag hints.
- 새 helper는 rejected `execFile` errors를 `unknown`에서 `Error`로 narrow하고 stdout/stderr를 text guard로 추출한다.

## 검증 증거

- Baseline filter: 원본 `tests/cli-help.test.ts`에서 recovery/argument/conflict filter 17 tests 통과.
- Split filter: `tests/cli-help.test.ts tests/cli-help-recovery.test.ts tests/cli-help-argument-validation.test.ts` + 동일 filter — 17 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-help.test.ts tests/cli-help-recovery.test.ts tests/cli-help-argument-validation.test.ts` — 3 files / 38 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 179 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: `tests/cli-help-recovery.test.ts`, `tests/cli-help-argument-validation.test.ts`에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-help.test.ts`: 479 pure LOC, 아직 oversized.
  - `tests/cli-help-recovery.test.ts`: 160 pure LOC.
  - `tests/cli-help-argument-validation.test.ts`: 151 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-help.test.ts`는 479 pure LOC로 추가 분리가 필요하다.
- 현재 CLI 테스트 oversized scan 기준 다음 최대 후보는 `tests/config.test.ts` 568 pure LOC이고, 그 다음이 `tests/cli-help.test.ts` 479 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
