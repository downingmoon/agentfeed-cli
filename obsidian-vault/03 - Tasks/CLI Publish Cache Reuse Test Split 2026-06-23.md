---
title: CLI Publish Cache Reuse Test Split 2026-06-23
aliases:
  - CLI publish cache reuse test split
  - Publish cache reusable upload split
tags:
  - agentfeed/cli
  - project/tasks
  - test-split
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: 32d10ce14b2e8658a53df0c20e381ea92f487b97
---

# CLI Publish Cache Reuse Test Split 2026-06-23

> [!success]
> Near-ceiling `tests/cli-publish-cache.test.ts`에서 reusable cached upload success/privacy policy coverage를 `tests/cli-publish-cache-reuse.test.ts`로 분리했다.

## 변경 내용

- `tests/cli-publish-cache.test.ts`
  - cached upload credential binding mismatch confirmation guardrail.
  - incompatible API metadata upload refusal.
  - cached upload reuse preflight API compatibility/token status guardrail.
  - 195 pure LOC 후보에서 140 pure LOC로 축소.
- `tests/cli-publish-cache-reuse.test.ts`
  - reusable cached upload success path with forced confirmation bypass.
  - high-severity private review draft direct publish privacy policy copy and secret redaction assertion.
  - 63 pure LOC.
- `tests/cli-publish-cache-helpers.ts`
  - shared publish cache fixtures/helpers reused unchanged.
  - 166 pure LOC.

## 검증

- Baseline: `npm test -- --run tests/cli-publish-cache.test.ts` → 1 file / 5 tests passed.
- Targeted split: `npm test -- --run tests/cli-publish-cache.test.ts tests/cli-publish-cache-reuse.test.ts` → 2 files / 5 tests passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 226 files / 848 tests passed.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, and tests were used as fallback evidence.

## 후행 과제

- `tests/*.ts` 190+ pure LOC 후보 없음.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.

## 관련

- [[CLI Codex Session Collector Window Test Split 2026-06-23]]
- [[Active Tasks]]
