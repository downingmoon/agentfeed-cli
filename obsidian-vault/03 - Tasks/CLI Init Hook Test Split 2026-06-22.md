---
title: CLI Init Hook Test Split 2026-06-22
aliases:
  - CLI init hook split
  - Init and hook setup UX split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: b5a3869
---

# CLI Init Hook Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-init-hook.test.ts`를 init setup UX와 hook setup UX focused suites로 분리했다. 공통 built CLI 실행/임시 프로젝트 fixture는 `tests/cli-init-hook-harness.ts`로 이동했고 기존 13개 CLI 표면 테스트의 관측 동작은 유지했다.

## 코드 커밋

- `b5a3869` — `Split CLI init hook tests`

## 변경 파일

- 삭제: `tests/cli-init-hook.test.ts`
- 추가: `tests/cli-init-hook-harness.ts`
- 추가: `tests/cli-init-setup-ux.test.ts`
- 추가: `tests/cli-hook-setup-ux.test.ts`

## 분리 범위

- `tests/cli-init-setup-ux.test.ts`
  - Git repository 밖 init recovery guidance.
  - Human init summary and setup next actions.
  - JSON init payload and setup checklist.
  - Existing config preservation without `--force`.
  - Forced init backup behavior.
- `tests/cli-hook-setup-ux.test.ts`
  - Uninitialized legacy hook setup recovery guidance.
  - Uninitialized hook uninstall cleanup behavior.
  - Hook install dry-run human/JSON output.
  - Hook install write behavior.
  - Hook uninstall human/JSON output and settings cleanup.
- `tests/cli-init-hook-harness.ts`
  - Built CLI path setup, per-test temp project/home directories, CI/token env isolation, failure output capture, common project init helper.

## 검증 증거

- Baseline: `npm test -- --run tests/cli-init-hook.test.ts` — 1 file / 13 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-init-setup-ux.test.ts tests/cli-hook-setup-ux.test.ts` — 2 files / 13 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 196 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: changed init/hook split files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-init-hook-harness.ts`: 76 pure LOC.
  - `tests/cli-init-setup-ux.test.ts`: 123 pure LOC.
  - `tests/cli-hook-setup-ux.test.ts`: 124 pure LOC.
- LSP diagnostics: changed `.ts` files 모두 `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-init-hook.test.ts` oversized는 삭제/분리로 해소됨.
- 현재 CLI 테스트 oversized scan 기준 다음 최대 후보는 `tests/cli-share-json-upload-output.test.ts` 245 pure LOC이고, 그 다음은 `tests/upload-preflight.test.ts` 244 pure LOC, `tests/duplicate-draft.test.ts` 243 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
