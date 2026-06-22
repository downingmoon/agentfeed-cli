---
title: CLI Codex Command Session Collector Metrics Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI Codex command session collector metrics test split
  - CLI Codex command session collector metrics test split
---

# CLI Codex Command Session Collector Metrics Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 Codex shell command/test-runner recognition, parallel tool expansion, non-shell tool/subagent/turn metrics coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `1334640 Split CLI Codex command session collector metrics tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-codex-command-metrics.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / Codex session collector command metrics suite isolation

## Background

[[CLI Codex Patch Session Collector Metrics Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` oversized state 중 command/test runner recognition cluster를 처리했다. 이번 pass는 Codex session JSONL parsing behavior 중 command execution, test-runner classification, nested tool expansion, subagent/turn accounting coverage만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-codex-command-metrics.test.ts` 추가.
  - Non-test command failure가 failed test로 오인되지 않는 계약을 보존했다.
  - `uv run --with pytest`, `python -m pytest`, `make test` 등 wrapped test command recognition 계약을 보존했다.
  - `pytest`, `vitest`, `playwright test` direct runner recognition 계약을 보존했다.
  - `playwright install`, `cypress open` 등 browser test setup/open commands를 executed tests로 세지 않는 계약을 보존했다.
  - `multi_tool_use.parallel` wrappers를 nested command/tool metrics로 확장하는 계약을 보존했다.
  - Codex non-shell tool calls, spawned subagents, agent turns, failed `spawn_agent` exclusion 계약을 보존했다.
- `tests/session-collector.test.ts`에서 Codex command/tool metrics cluster test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "non-test command failures|common wrapped test commands|direct test runner commands|browser test setup commands|parallel tool wrappers|non-shell tool calls|failed Codex spawn_agent": 1 file / 7 tests passed / 46 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-codex-command-metrics.test.ts -t "non-test command failures|common wrapped test commands|direct test runner commands|browser test setup commands|parallel tool wrappers|non-shell tool calls|failed Codex spawn_agent": 1 file passed / 1 skipped, 7 tests passed / 46 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-codex-command-metrics.test.ts: 2 files / 53 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 165 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new Codex command metrics suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 958 pure LOC after split; still oversized.
tests/session-collector-codex-command-metrics.test.ts: 144 pure LOC.
```

## Follow-up

> [!todo]
> `tests/session-collector.test.ts` remains oversized at 958 pure LOC. Continue only by cohesive behavior clusters such as session ownership/discovery, Gemini metrics, OMX/generic metadata, draft integration, or collection window filtering. Preserve baseline coverage before each split.
