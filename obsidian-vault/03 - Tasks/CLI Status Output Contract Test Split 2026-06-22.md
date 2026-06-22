---
title: CLI Status Output Contract Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI status output contract test split
  - CLI status output contract test split
---

# CLI Status Output Contract Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 status human output, ANSI suppression, JSON automation output, secret non-leak coverage를 focused suite로 분리했다. 원본 suite를 202 pure LOC로 낮춰 250 pure LOC ceiling 아래로 복귀시켰고 Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `4a7f09a Split CLI status output contract tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-status-output-contracts.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / status output contract suite isolation

## Background

[[CLI Doctor Readiness Guidance Test Split 2026-06-22]] follow-up에 남아 있던 status output/ANSI diagnostics cluster를 처리했다. 이번 pass는 `agentfeed status`의 human-readable sectioning, ANSI suppression, JSON automation output and secret redaction coverage를 purpose-named suite로 이동했다.

## Changes

- `tests/cli-status-output-contracts.test.ts` 추가.
  - Human `agentfeed status` output이 sectioned UX copy와 required diagnostics를 유지하는 계약을 보존했다.
  - `NO_COLOR=1`과 non-TTY stdout에서 ANSI escapes가 출력되지 않는 계약을 보존했다.
  - `agentfeed status --json` output이 parseable automation shape, expected readiness summary, next action, secret non-leak behavior를 유지하는 계약을 보존했다.
  - 신규 suite의 JSON output type assertion을 explicit type assignment로 정리해 `as { ... }` assertion을 피했다.
- `tests/cli-status-doctor.test.ts`에서 status output test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "status presents sectioned UX|status prints without ANSI escapes|status json prints parseable": 1 file / 4 tests passed / 4 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-status-output-contracts.test.ts -t "status presents sectioned UX|status prints without ANSI escapes|status json prints parseable": 1 file passed / 1 skipped, 4 tests passed / 4 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-status-output-contracts.test.ts: 2 files / 8 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 162 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new status output suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 202 pure LOC after split; below the 250 pure LOC ceiling.
tests/cli-status-output-contracts.test.ts: 149 pure LOC.
```

## Follow-up

> [!success]
> `tests/cli-status-doctor.test.ts` is now below the 250 pure LOC ceiling. Continue enterprise hardening by scanning the next oversized or contract-risk CLI/Frontend/Backend surface before editing.
