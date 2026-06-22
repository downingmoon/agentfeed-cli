---
title: CLI Share Command Residual Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI share command residual test split
  - CLI share command residual test split
---

# CLI Share Command Residual Test Split 2026-06-22

> [!success]
> CLI generic `tests/cli-share.test.ts`에 남아 있던 마지막 2개 share 계약을 purpose-named suites로 분리하고 catch-all suite를 제거했다. CLI production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `2f0862f Split remaining CLI share command tests`
- 변경 파일:
  - `tests/cli-share.test.ts` 삭제
  - `tests/cli-share-human-upload-output.test.ts`
  - `tests/cli-share-dry-run-command-policy.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / generic share suite removal

## Background

`tests/cli-share.test.ts`는 이전 split 이후 219 pure LOC로 250 LOC ceiling 아래였지만, human-readable upload completion output과 dry-run command execution policy라는 서로 다른 책임을 같이 들고 있었다. 이전 [[CLI Publish Review Handoff Test Split 2026-06-22]] follow-up의 remaining split candidates를 처리해 generic catch-all suite를 없앴다.

## Changes

- `tests/cli-share-human-upload-output.test.ts` 추가.
  - `agentfeed share --yes` human upload completion output의 heading/summary/status/review URL/next action/order/no handoff 계약을 유지한다.
  - 기존 preflight/body parser fixture와 share guidance fixture를 재사용했다.
- `tests/cli-share-dry-run-command-policy.test.ts` 추가.
  - project config에서 command collection이 켜져 있어도 `agentfeed share --dry-run --all`은 configured project command를 실행하지 않는 계약을 유지한다.
- `tests/cli-share.test.ts` 삭제.
- CLI production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline: npm test -- --run tests/cli-share.test.ts: 1 file / 2 tests passed
Targeted split: npm test -- --run tests/cli-share-human-upload-output.test.ts tests/cli-share-dry-run-command-policy.test.ts: 2 files / 2 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 132 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
No-excuse grep: no as any/as unknown/@ts-ignore/@ts-expect-error/TODO/FIXME/eslint-disable/empty catch/non-null additions in changed files
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC audit:

```text
tests/cli-share-human-upload-output.test.ts: 87 pure LOC
tests/cli-share-dry-run-command-policy.test.ts: 56 pure LOC
tests/cli-share.test.ts: removed
```

## Follow-up

> [!todo]
> No remaining `tests/cli-share.test.ts` work. First `tests/api-hook.test.ts` extraction completed in [[CLI Claude Hook Installer Test Split 2026-06-22]], but broader CLI test-suite hardening candidates remain. `tests/api-hook.test.ts` first extraction series is now healthy, and the first `tests/cli-status-doctor.test.ts` doctor API health extraction was completed in [[CLI Doctor API Health Test Split 2026-06-22]]. Remaining large candidates include `tests/cli-status-doctor.test.ts`, `tests/session-collector.test.ts`, and `tests/cli-collect.test.ts`; split only when a cohesive contract group is identified and baseline coverage is green.
