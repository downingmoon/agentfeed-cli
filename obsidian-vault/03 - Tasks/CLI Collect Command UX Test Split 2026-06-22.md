---
title: CLI Collect Command UX Test Split 2026-06-22
aliases:
  - CLI collect command UX split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: f967e9a
---

# CLI Collect Command UX Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-collect.test.ts`에서 collect command human/help/dry-run/session-file/source validation UX coverage를 focused suite로 분리했다.

## 코드 커밋

- `f967e9a` — `Split CLI collect command UX tests`

## 변경 파일

- `tests/cli-collect.test.ts`
- `tests/cli-collect-command-ux.test.ts`

## 분리 범위

- Human-readable `agentfeed collect --explain` output contract.
- `agentfeed collect --help` local-state non-mutating help contract.
- `--dry-run` local-only alias UX.
- Explicit `--session-file` missing/parse warning output.
- Contradictory `--dry-run --upload` validation.
- Unsupported `--source` typo recovery guidance.
- 신규 suite에서는 JSON/command-failure parsing을 `unknown` narrowing helper로 처리해 기존 moved code의 assertion 의존을 줄였다.

## 검증 증거

- Baseline filter: `human-readable explain|subcommand help|collect dry-run|session-file|unsupported source` — 원본 `tests/cli-collect.test.ts`에서 7 tests 통과.
- Split filter: `tests/cli-collect.test.ts tests/cli-collect-command-ux.test.ts` + 동일 filter — 7 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-collect.test.ts tests/cli-collect-command-ux.test.ts` — 2 files / 20 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 174 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: `tests/cli-collect-command-ux.test.ts`에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-collect.test.ts`: 566 pure LOC, 아직 oversized.
  - `tests/cli-collect-command-ux.test.ts`: 201 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-collect.test.ts`가 566 pure LOC로 아직 250 LOC ceiling 초과.
- 다음 후보: config/cursor/malformed draft warning cluster, JSON local output/login guidance/incompatible metadata cluster, successful JSON upload/open-review handoff cluster.

## 범위 제한

- 신규 앱 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
