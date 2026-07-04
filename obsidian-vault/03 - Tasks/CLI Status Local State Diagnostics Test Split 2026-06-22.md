---
title: CLI Status Local State Diagnostics Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI status local state diagnostics test split
  - CLI status local state diagnostics test split
---

# CLI Status Local State Diagnostics Test Split 2026-06-22

> [!success]
> CLI oversized `tests/cli-status-doctor.test.ts`에서 local collection cursor, pending draft cursor warning, malformed cursor warning, malformed Claude Code settings diagnostics coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `8e46660 Split CLI status local state diagnostics tests`
- 변경 파일:
  - `tests/cli-status-doctor.test.ts`
  - `tests/cli-status-local-state-diagnostics.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / status local state diagnostics suite isolation

## Background

[[CLI Status Readiness Guidance Test Split 2026-06-22]] follow-up에 남아 있던 status cursor/config diagnostics cluster 중 local state diagnostics를 처리했다. 이번 pass는 `agentfeed status`의 collection cursor and local malformed-state diagnostics coverage를 purpose-named suite로 이동했다.

## Changes

- `tests/cli-status-local-state-diagnostics.test.ts` 추가.
  - Collection cursor가 status output에 표시되고 next default collection boundary로 쓰이는 계약을 보존했다.
  - Cursor가 설정된 상태에서 pending local drafts가 있으면 다음 collect가 비어 보일 수 있다는 warning과 publish suggestion이 표시되는 계약을 보존했다.
  - Malformed `.agentfeed/state.json`이 explicit warning으로 표시되고 cursor fallback이 `none` / `beginning`으로 렌더링되는 계약을 보존했다.
  - Malformed `.claude/settings.json` 상태에서도 status command가 살아남는 계약을 보존했다.
- `tests/cli-status-doctor.test.ts`에서 local state diagnostics test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/cli-status-doctor.test.ts -t "status reports the collection cursor|status reports malformed collection cursor|status survives malformed Claude Code settings": 1 file / 3 tests passed / 11 skipped
Filtered split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-status-local-state-diagnostics.test.ts -t "status reports the collection cursor|status reports malformed collection cursor|status survives malformed Claude Code settings": 1 file passed / 1 skipped, 3 tests passed / 11 skipped
Targeted split: npm test -- --run tests/cli-status-doctor.test.ts tests/cli-status-local-state-diagnostics.test.ts: 2 files / 14 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 160 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no substantive as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new local-state diagnostics suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/cli-status-doctor.test.ts: 452 pure LOC after split; still oversized.
tests/cli-status-local-state-diagnostics.test.ts: 81 pure LOC.
```

## Follow-up

> [!success]
> Doctor setup/action ordering and API remediation follow-up was completed by [[CLI Doctor Readiness Guidance Test Split 2026-06-22]]. `tests/cli-status-doctor.test.ts` is now 324 pure LOC.

> [!todo]
> `tests/cli-status-doctor.test.ts` remains oversized at 324 pure LOC. Continue only by cohesive behavior clusters such as status output/ANSI diagnostics, package/version and provenance diagnostics, or doctor JSON/provenance diagnostics. Preserve baseline coverage before each split.
