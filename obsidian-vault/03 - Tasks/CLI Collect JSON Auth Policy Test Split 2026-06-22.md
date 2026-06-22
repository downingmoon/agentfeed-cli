---
title: CLI Collect JSON Auth Policy Test Split 2026-06-22
aliases:
  - CLI collect JSON auth policy split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 81b9f89
---

# CLI Collect JSON Auth Policy Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-collect.test.ts`에서 JSON/auth/API compatibility coverage와 collect policy coverage를 focused suites로 분리해 원본 suite를 250 pure LOC ceiling 아래로 복귀시켰다.

## 코드 커밋

- `81b9f89` — `Split CLI collect JSON auth policy tests`

## 변경 파일

- `tests/cli-collect.test.ts`
- `tests/cli-collect-json-auth.test.ts`
- `tests/cli-collect-policy.test.ts`

## 분리 범위

- `tests/cli-collect-json-auth.test.ts`
  - Parseable collect JSON output contract.
  - JSON collect upload missing-token guidance.
  - Human collect upload missing-token guidance.
  - API metadata incompatibility fail-fast before token/ingest.
- `tests/cli-collect-policy.test.ts`
  - Idle-gap collection window auto-slicing.
  - Repo-local `auto_upload` ignored unless `--upload` is explicit.
- 신규 suites에서는 moved JSON/error payload assertions를 `unknown` narrowing helper로 처리해 direct assertion 의존을 줄였다.

## 검증 증거

- Baseline filter: `parseable collect JSON|guides login before collect JSON upload|guides login before human collect upload|API metadata is incompatible|auto-slices default collect windows|auto_upload unless` — 원본 `tests/cli-collect.test.ts`에서 6 tests 통과.
- Split filter: `tests/cli-collect.test.ts tests/cli-collect-json-auth.test.ts tests/cli-collect-policy.test.ts` + 동일 filter — 6 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-collect.test.ts tests/cli-collect-json-auth.test.ts tests/cli-collect-policy.test.ts` — 3 files / 8 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 177 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: `tests/cli-collect-json-auth.test.ts`, `tests/cli-collect-policy.test.ts`에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-collect.test.ts`: 242 pure LOC, 250 ceiling 아래 복귀.
  - `tests/cli-collect-json-auth.test.ts`: 205 pure LOC.
  - `tests/cli-collect-policy.test.ts`: 100 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-collect.test.ts`는 242 pure LOC로 이번 cleanup 대상 ceiling은 해소됨.
- 다음 후보는 CLI 테스트 전체 oversized scan을 다시 돌려 가장 큰 남은 파일을 선택한다.

## 범위 제한

- 신규 앱 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
