---
title: CLI Browser Login API Discovery Test Split 2026-06-22
aliases:
  - CLI browser login API discovery test split
  - Browser login repo API discovery split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-22
updated: 2026-06-22
code_commit: b3c5bf2ddeb5edbf497cd95ee8d622eee9f5227f
---

# CLI Browser Login API Discovery Test Split 2026-06-22

> [!success]
> Near-ceiling `tests/cli-browser-login-save-policy.test.ts`에서 repo-local `BACKEND_PORT` API discovery trust policy coverage를 `tests/cli-browser-login-api-discovery.test.ts`로 분리하고 existing browser-login shared fixture/helper를 재사용했다.

## 변경 내용

- `tests/cli-browser-login-save-policy.test.ts`
  - invalid exchanged ingestion token refusal.
  - incompatible API metadata pre-save refusal.
  - `save: false` no-open browser login non-persistence.
  - shared temp home/project setup과 credentials path assertion을 `tests/cli-browser-login-flow-helpers.ts`로 통일.
  - 197 pure LOC 후보에서 113 pure LOC로 축소.
- `tests/cli-browser-login-api-discovery.test.ts`
  - untrusted repo-local `.env:BACKEND_PORT` discovery ignore policy.
  - `AGENTFEED_TRUST_REPO_API_BASE=1` trusted repo-local API discovery acceptance.
  - 62 pure LOC.
- `tests/cli-browser-login-flow-helpers.ts`
  - existing fixture/helper 재사용.
  - 100 pure LOC 유지.

## 검증

- Baseline: `npm test -- --run tests/cli-browser-login-save-policy.test.ts` → 1 file / 5 tests passed.
- Targeted split: `npm test -- --run tests/cli-browser-login-save-policy.test.ts tests/cli-browser-login-api-discovery.test.ts` → 2 files / 5 tests passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 223 files / 848 tests passed.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, and tests were used as fallback evidence.

## 후행 과제

- 다음 190+ pure LOC 후보:
  - `tests/config-credential-resolution.test.ts` — 196 pure LOC.
  - `tests/session-collector.test.ts` — 195 pure LOC.
  - `tests/cli-publish-cache.test.ts` — 195 pure LOC.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.

## 관련

- [[CLI Browser Login Flow Residual Test Split 2026-06-22]]
- [[Active Tasks]]
