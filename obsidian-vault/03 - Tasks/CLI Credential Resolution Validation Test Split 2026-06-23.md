---
title: CLI Credential Resolution Validation Test Split 2026-06-23
aliases:
  - CLI credential resolution validation test split
  - Credential file validation split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: 1d3fac8e62a9183d0f84aaf93e49b7f120678320
---

# CLI Credential Resolution Validation Test Split 2026-06-23

> [!success]
> Near-ceiling `tests/config-credential-resolution.test.ts`에서 malformed/invalid credential file validation coverage를 `tests/config-credential-file-validation.test.ts`로 분리하고 shared HOME/env isolation 및 credential file writer fixture를 `tests/config-credential-resolution-helpers.ts`로 통합했다.

## 변경 내용

- `tests/config-credential-resolution.test.ts`
  - repo-local API discovery trust policy.
  - environment token vs saved API base precedence.
  - saved token host override warning.
  - `resolveCredentials` missing-token/login-command diagnostics.
  - credential/API base provenance redaction.
  - 196 pure LOC 후보에서 100 pure LOC로 축소.
- `tests/config-credential-file-validation.test.ts`
  - malformed credentials file warning and no-crash behavior.
  - environment token precedence over malformed file.
  - invalid stored runtime type rejection.
  - environment token precedence over invalid stored shapes.
  - 56 pure LOC.
- `tests/config-credential-resolution-helpers.ts`
  - shared temp config/home fixture.
  - relevant environment variable cleanup/restore.
  - shared global credentials file writers.
  - 68 pure LOC.

## 검증

- Baseline: `npm test -- --run tests/config-credential-resolution.test.ts` → 1 file / 11 tests passed.
- Targeted split: `npm test -- --run tests/config-credential-resolution.test.ts tests/config-credential-file-validation.test.ts` → 2 files / 11 tests passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 224 files / 848 tests passed.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, and tests were used as fallback evidence.

## 후행 과제

- 다음 190+ pure LOC 후보:
  - `tests/session-collector.test.ts` — 195 pure LOC.
  - `tests/cli-publish-cache.test.ts` — 195 pure LOC.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.

## 관련

- [[CLI Browser Login API Discovery Test Split 2026-06-22]]
- [[Active Tasks]]
