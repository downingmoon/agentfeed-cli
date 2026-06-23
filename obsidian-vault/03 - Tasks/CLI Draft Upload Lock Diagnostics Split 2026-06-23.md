---
title: CLI Draft Upload Lock Diagnostics Split 2026-06-23
aliases:
  - CLI draft upload lock diagnostics split
  - Draft upload lock diagnostics split
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - upload-lock
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: 1b26acb3f2db5a4dd6c3d65050d95c8686a6aa87
---

# CLI Draft Upload Lock Diagnostics Split 2026-06-23

> [!success]
> CLI draft upload lock acquisition module에서 held-lock diagnostics/message formatting을 `src/api/draft-upload-lock-diagnostics.ts`로 분리했다. Lock acquisition, heartbeat, stale-lock removal, matching token-hash release behavior는 유지했다.

## 변경 내용

- `src/api/draft-upload-lock.ts`
  - lock acquisition/release, heartbeat, stale lock removal, token-hash ownership check만 보존.
  - 215 pure LOC oversized source 후보에서 146 pure LOC로 축소.
- `src/api/draft-upload-lock-diagnostics.ts`
  - stale timeout constant, `DraftUploadLockDiagnostics`, diagnostics JSON parsing, lock fingerprinting, user-facing locked message formatting을 담당.
  - 75 pure LOC.

## 검증

- Targeted lock contract: `npm test -- --run tests/cli-upload-lock-contract.test.ts` → 1 file / 5 tests passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 226 files / 848 tests passed.
- Manual built CLI smoke: local compatible API + held `.json.upload.lock` 상태에서 `dist/cli/index.js publish --id <draft> --yes --json` 실행 → non-zero lock failure, user-facing "Another agentfeed process is uploading draft" guidance 출력, `INGEST_COUNT=0` 확인.
- Changed-file no-excuse grep → no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, TODO/FIXME, eslint-disable, empty catch, or non-null assertion additions.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, targeted/full tests, and built CLI smoke were used as fallback evidence.

## 후행 과제

- 남은 CLI source 190+ pure LOC 후보:
  - `src/collectors/agent-session.ts` — 1157 pure LOC.
  - `src/draft/create.ts` — 607 pure LOC.
  - `src/config/credentials.ts` — 603 pure LOC.
  - `src/collectors/test-command.ts` — 308 pure LOC.
  - `src/types.ts` — 233 pure LOC.
  - `src/cli/index.ts` — 230 pure LOC.
  - `src/draft/validation.ts` — 225 pure LOC.
  - `src/config/project-config.ts` — 222 pure LOC.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.

## 관련

- [[CLI Redacted Public Field Primitive Split 2026-06-23]]
- [[Active Tasks]]
