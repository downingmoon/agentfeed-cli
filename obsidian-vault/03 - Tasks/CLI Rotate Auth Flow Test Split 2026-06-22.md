---
title: CLI Rotate Auth Flow Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI rotate auth flow test split
  - CLI rotate auth flow test split
---

# CLI Rotate Auth Flow Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 rotate auth flow/failure coverage를 focused suites로 분리했다. CI browser fail-fast, environment-token refusal, browser-approved token replacement, incompatible metadata refusal 계약을 production/runtime 동작 변경 없이 보존했고 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Commit:
  - `4736b58 Split CLI rotate auth flow tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-rotate-ci-env-failures.test.ts`
  - `tests/cli-rotate-browser-replacement.test.ts`
  - `tests/cli-rotate-metadata-failure.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / rotate auth flow suite isolation

## Background

[[CLI Login Safe Token Guidance Test Split 2026-06-22]] follow-up에 남아 있던 rotate replacement/failure cases가 다음 cohesive behavior cluster였다. 이번 pass는 rotate 관련 4개 tests를 세 suite로 분리했다. 최초 2-suite 분리 후 browser replacement suite가 250 pure LOC ceiling을 넘어서 metadata incompatibility failure를 별도 suite로 한 번 더 분리했다.

## Changes

- `tests/cli-rotate-ci-env-failures.test.ts` 추가.
  - CI에서 browser login 없이 fast-fail하고 token remediation만 안내하는 계약을 보존했다.
  - environment `AGENTFEED_TOKEN` 기반 rotate refusal이 secret-manager remediation과 `agentfeed status` next action을 제공하고 secret을 누출하지 않는 계약을 보존했다.
- `tests/cli-rotate-browser-replacement.test.ts` 추가.
  - saved token이 browser-approved session rotation으로 replacement되고 old/new secrets가 stdout에 출력되지 않는 계약을 보존했다.
  - session create/exchange request body parsing을 `unknown` boundary helper로 처리했다.
- `tests/cli-rotate-metadata-failure.test.ts` 추가.
  - incompatible API metadata에서 session request 전에 실패하고 기존 saved token을 보존하는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 rotate test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "rotate": 1 file / 4 tests passed / 20 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-rotate-ci-env-failures.test.ts tests/cli-rotate-browser-replacement.test.ts tests/cli-rotate-metadata-failure.test.ts -t "rotate": 3 files passed / 1 skipped, 4 tests passed / 20 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-rotate-ci-env-failures.test.ts tests/cli-rotate-browser-replacement.test.ts tests/cli-rotate-metadata-failure.test.ts: 4 files / 24 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 157 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new rotate suites.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 722 pure LOC after split; still oversized.
tests/cli-rotate-ci-env-failures.test.ts: 113 pure LOC.
tests/cli-rotate-browser-replacement.test.ts: 202 pure LOC.
tests/cli-rotate-metadata-failure.test.ts: 136 pure LOC.
```

## Follow-up

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 722 pure LOC. Continue only by cohesive behavior clusters such as browser login no-save output, status project/readiness diagnostics, status cursor/config diagnostics, or doctor JSON/provenance diagnostics. Preserve baseline coverage before each split.
