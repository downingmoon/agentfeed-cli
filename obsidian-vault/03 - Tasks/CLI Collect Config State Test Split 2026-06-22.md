---
title: CLI Collect Config State Test Split 2026-06-22
aliases:
  - CLI collect config state split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 627369e
---

# CLI Collect Config State Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-collect.test.ts`에서 collect config/state warning and cursor persistence coverage를 focused suite로 분리했다.

## 코드 커밋

- `627369e` — `Split CLI collect config state tests`

## 변경 파일

- `tests/cli-collect.test.ts`
- `tests/cli-collect-config-state.test.ts`

## 분리 범위

- Malformed collection cursor warning.
- Malformed saved draft duplicate-detection warning.
- Malformed project config JSON recovery guidance.
- Malformed project config shape fail-fast guidance.
- JSON output cursor persistence.
- 신규 suite에서는 collect JSON/error parsing을 `unknown` narrowing helper로 처리해 moved code의 direct assertion 의존을 줄였다.

## 검증 증거

- Baseline filter: `malformed collection cursor|malformed saved drafts|malformed project config|persists collection cursor` — 원본 `tests/cli-collect.test.ts`에서 5 tests 통과.
- Split filter: `tests/cli-collect.test.ts tests/cli-collect-config-state.test.ts` + 동일 filter — 5 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-collect.test.ts tests/cli-collect-config-state.test.ts` — 2 files / 13 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 175 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: `tests/cli-collect-config-state.test.ts`에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-collect.test.ts`: 453 pure LOC, 아직 oversized.
  - `tests/cli-collect-config-state.test.ts`: 222 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-collect.test.ts`가 453 pure LOC로 아직 250 LOC ceiling 초과.
- 다음 후보: JSON local output/login guidance/incompatible metadata cluster, successful JSON upload/open-review handoff cluster, idle-gap/auto-upload policy cluster.

## 범위 제한

- 신규 앱 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
