---
title: CLI Git Draft Test Split 2026-06-22
aliases:
  - CLI git draft split
  - Git draft configured command validation split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 51c09d7
---

# CLI Git Draft Test Split 2026-06-22

## 요약

CLI oversized `tests/git-draft.test.ts`에서 configured command collection coverage와 local draft runtime validation coverage를 focused suites로 분리했다. 원본 suite는 git collector, draft artifact, privacy/upload payload, git-only agent attribution coverage 중심으로 줄였고 원본 및 신규 suites 모두 250 pure LOC ceiling 아래다.

## 코드 커밋

- `51c09d7` — `Split CLI git draft tests`

## 변경 파일

- `tests/git-draft.test.ts`
- `tests/git-draft-configured-commands.test.ts`
- `tests/git-draft-validation.test.ts`

## 분리 범위

- `tests/git-draft.test.ts`
  - Git changed-file and line-count metrics.
  - Untracked/local-runtime file filtering.
  - Non-git graceful fallback.
  - Draft artifact creation and private permissions.
  - `include_file_stats=false` public draft behavior.
  - Git-only auto agent attribution and global signal isolation.
- `tests/git-draft-configured-commands.test.ts`
  - Configured commands do not run by default.
  - Explicit opt-in command metrics.
  - Shell interpreter and wrapper command refusal.
  - Sensitive environment scrubbing.
  - Failed command metric recording without raw output upload.
  - Auto test/build command inference and malformed `package.json` warnings.
- `tests/git-draft-validation.test.ts`
  - Valid local draft round-trip through runtime validation.
  - Backend-supported privacy severity acceptance.
  - Corrupted local draft field guidance.

## 검증 증거

- Baseline filter: 원본 `tests/git-draft.test.ts` selected configured-command/validation filter — 13 tests 통과, 10 skipped.
- Targeted split suite: `npm test -- --run tests/git-draft.test.ts tests/git-draft-configured-commands.test.ts tests/git-draft-validation.test.ts` — 3 files / 23 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 191 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: changed git-draft suites에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/git-draft.test.ts`: 159 pure LOC.
  - `tests/git-draft-configured-commands.test.ts`: 214 pure LOC.
  - `tests/git-draft-validation.test.ts`: 82 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/git-draft.test.ts` oversized는 해소됨.
- 현재 CLI 테스트 oversized scan 기준 다음 최대 후보는 `tests/cli-drafts.test.ts` 363 pure LOC이고, 그 다음은 `tests/release-preflight.test.ts` 351 pure LOC, `tests/cli-init-hook.test.ts` 284 pure LOC다.

## 범위 제한

- 신규 앱 기능 없음.
- CLI-Frontend-Backend 계약 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
