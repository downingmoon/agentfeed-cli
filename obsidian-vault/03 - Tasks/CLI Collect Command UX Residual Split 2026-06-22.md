---
title: CLI Collect Command UX Residual Split 2026-06-22
aliases:
  - CLI collect command UX residual split
  - CLI collect session file diagnostics split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: 6fb1deab3971ae5ea19a2269985a8ae63007f123
---

# CLI Collect Command UX Residual Split 2026-06-22

> [!success]
> Near-ceiling `tests/cli-collect-command-ux.test.ts`에서 session-file missing/parse diagnostics coverage를 `tests/cli-collect-command-session-file.test.ts`로 분리하고 shared CLI runner/temp git fixture/JSON parser를 `tests/cli-collect-command-ux-helpers.ts`로 통합했다.

## 변경 내용

- `tests/cli-collect-command-ux.test.ts`
  - Human explain, help, dry-run alias, validation rejection coverage만 유지.
  - 201 pure LOC 후보에서 73 pure LOC로 축소.
- `tests/cli-collect-command-session-file.test.ts`
  - explicit `--session-file` missing warning human output.
  - explicit `--session-file` parse miss JSON warning output.
  - 41 pure LOC.
- `tests/cli-collect-command-ux-helpers.ts`
  - temp git repo/home fixture.
  - built CLI collect runner/failure runner.
  - draft/state absence assertions.
  - JSON object/string-array parser.
  - 100 pure LOC.

## 검증

- Baseline: `npm test -- --run tests/cli-collect-command-ux.test.ts` → 1 file / 7 tests passed.
- Targeted split: `npm test -- --run tests/cli-collect-command-ux.test.ts tests/cli-collect-command-session-file.test.ts` → 2 files / 7 tests passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 221 files / 848 tests passed.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, and tests were used as fallback evidence.

## 후행 과제

- 다음 190+ pure LOC 후보:
  - `tests/release-preflight.test.ts` — 200 pure LOC.
  - `tests/cli-browser-login-save-policy.test.ts` — 197 pure LOC.
  - `tests/config-credential-resolution.test.ts` — 196 pure LOC.
  - `tests/session-collector.test.ts` — 195 pure LOC.
  - `tests/cli-publish-cache.test.ts` — 195 pure LOC.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.

## 관련

- [[CLI Collect Command UX Test Split 2026-06-22]]
- [[Active Tasks]]
