---
title: CLI Collect Upload Failure Test Split 2026-06-22
aliases:
  - CLI collect upload failure split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 00e15ff
---

# CLI Collect Upload Failure Test Split 2026-06-22

## 요약

CLI oversized `tests/cli-collect.test.ts`에서 collect JSON upload failure/cursor preservation coverage를 focused suite로 분리했다.

## 코드 커밋

- `00e15ff` — `Split CLI collect upload failure tests`

## 변경 파일

- `tests/cli-collect.test.ts`
- `tests/cli-collect-upload-failures.test.ts`
- `tests/cli-collect-upload-failure-helpers.ts`

## 분리 범위

- collect JSON upload 전 ingestion token preflight 실패 시 ingest 요청 차단.
- collect JSON upload preflight 실패 시 collection cursor 미변경.
- collect JSON ingest upload 실패 시 collection cursor 미변경.
- 신규 helper에서 HTTP preflight fixture, CLI failure JSON parsing, request drain을 typed helper로 분리.

## 검증 증거

- Baseline filter: `ingestion token preflight|collection cursor unchanged when collect JSON upload preflight fails|collection cursor unchanged when collect JSON ingest upload fails` — 3 tests 통과.
- Split filter: `tests/cli-collect.test.ts tests/cli-collect-upload-failures.test.ts` + 동일 filter — 3 tests 통과.
- Targeted split suite: `npm test -- --run tests/cli-collect.test.ts tests/cli-collect-upload-failures.test.ts` — 2 files / 23 tests 통과.
- Typecheck: `npm run typecheck` — `tsc --noEmit` 통과.
- Build: `npm run build` — `tsc` + `postbuild` 통과.
- Full CLI suite: `npm test -- --run` — 173 files / 848 tests 통과.
- Whitespace: `git diff --check` — 출력 없음.
- No-excuse scan: changed upload-failure files에서 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, empty catch 매칭 없음.
- LOC audit:
  - `tests/cli-collect.test.ts`: 716 pure LOC, 아직 oversized.
  - `tests/cli-collect-upload-failures.test.ts`: 223 pure LOC.
  - `tests/cli-collect-upload-failure-helpers.ts`: 72 pure LOC.
- LSP diagnostics: `Transport closed`; `npm run typecheck`를 fallback 증거로 사용.

## 남은 작업

- `tests/cli-collect.test.ts`가 716 pure LOC로 아직 250 LOC ceiling 초과.
- 다음 후보: human/readable collect UX/help/dry-run/session-file warning cluster, config/cursor/malformed draft warning cluster, JSON local output/login guidance/incompatible metadata cluster, successful JSON upload/open-review handoff cluster.

## 범위 제한

- 신규 앱 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 상태라 push/deploy 없음.

## 관련

- [[Active Tasks]]
