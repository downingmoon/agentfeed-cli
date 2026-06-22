---
title: CLI Release Preflight Residual Split 2026-06-22
aliases:
  - CLI release preflight residual split
  - Release preflight docs guardrail split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: c20822b4aa0388a0e088a2a6efb7e95946cd0dd4
---

# CLI Release Preflight Residual Split 2026-06-22

> [!success]
> Near-ceiling `tests/release-preflight.test.ts`에서 CI workflow/README documentation policy guardrails를 `tests/release-preflight-docs.test.ts`로 분리하고 shared package/pack fixtures와 file readers를 `tests/release-preflight-helpers.ts`로 통합했다.

## 변경 내용

- `tests/release-preflight.test.ts`
  - `parsePackJson`, `validatePackResult`, `validatePackageMetadata`, `validateReleaseGitRef` guardrail coverage만 유지.
  - 200 pure LOC 후보에서 95 pure LOC로 축소.
- `tests/release-preflight-docs.test.ts`
  - Windows DPAPI CI smoke ordering.
  - CI audit/build/preflight ordering and trigger policy.
  - CLI onboarding README command flow.
  - credential storage policy documentation.
  - 67 pure LOC.
- `tests/release-preflight-helpers.ts`
  - shared valid package metadata fixture.
  - shared valid pack result fixture.
  - CI workflow/README readers.
  - 49 pure LOC.

## 검증

- Baseline: `npm test -- --run tests/release-preflight.test.ts` → 1 file / 9 tests passed.
- Targeted split: `npm test -- --run tests/release-preflight.test.ts tests/release-preflight-docs.test.ts` → 2 files / 9 tests passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 222 files / 848 tests passed.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, and tests were used as fallback evidence.

## 후행 과제

- 다음 190+ pure LOC 후보:
  - `tests/cli-browser-login-save-policy.test.ts` — 197 pure LOC.
  - `tests/config-credential-resolution.test.ts` — 196 pure LOC.
  - `tests/session-collector.test.ts` — 195 pure LOC.
  - `tests/cli-publish-cache.test.ts` — 195 pure LOC.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.

## 관련

- [[CLI Release Preflight Test Split 2026-06-22]]
- [[Active Tasks]]
