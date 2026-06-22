---
title: CLI Session Collector Draft Integration Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI session collector draft integration test split
  - CLI session collector draft integration test split
---

# CLI Session Collector Draft Integration Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 draft integration/evidence filtering coverage를 focused suite로 분리했다. 원본 session collector suite는 195 pure LOC로 250 ceiling 아래로 복귀했고, production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `1855ab1 Split CLI session collector draft integration tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-draft-integration.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / draft integration and public evidence suite isolation

## Background

[[CLI Session Collector Generic Metadata Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` 280 pure LOC state를 처리했다. 이번 pass는 draft creation, git/session changed-file merge, metadata path public evidence filtering, and explicit collection window draft serialization contracts만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-draft-integration.test.ts` 추가.
  - Clean git tree에서 Codex session metrics로 draft를 생성하고 raw transcript content를 draft JSON에 노출하지 않는 계약을 보존했다.
  - Git dirty files와 agent session changed files를 draft metrics/changed areas에 merge하는 계약을 보존했다.
  - `.omx`, `.cursor`, `.agentfeed/drafts`, `.DS_Store`, Obsidian internal metadata paths가 public changed-file evidence에 노출되지 않는 계약을 보존했다.
  - Explicit `since`/`until` collection window가 draft source에 normalized ISO timestamp로 저장되는 계약을 보존했다.
- `tests/session-collector.test.ts`에서 draft integration/evidence filtering cluster를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "clean git tree|git dirty files|metadata paths reported|explicit collection windows": 1 file / 4 tests passed / 9 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-draft-integration.test.ts -t "clean git tree|git dirty files|metadata paths reported|explicit collection windows": 1 file passed / 1 skipped, 4 tests passed / 9 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-draft-integration.test.ts: 2 files / 13 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 172 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new draft integration suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 195 pure LOC after split; 250 ceiling satisfied.
tests/session-collector-draft-integration.test.ts: 107 pure LOC.
```

## Follow-up

> [!todo]
> `tests/session-collector.test.ts` is now under the 250 pure LOC ceiling. Remaining collection window filtering coverage can stay in place unless future edits grow the file again.
