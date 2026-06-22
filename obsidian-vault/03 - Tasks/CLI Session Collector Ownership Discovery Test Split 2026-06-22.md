---
title: CLI Session Collector Ownership Discovery Test Split 2026-06-22
date: 2026-06-22
status: done
tags:
  - agentfeed/cli
  - agentfeed/contracts
  - agentfeed/tests
  - project/tasks
aliases:
  - 2026-06-22 CLI session collector ownership discovery test split
  - CLI session collector ownership discovery test split
---

# CLI Session Collector Ownership Discovery Test Split 2026-06-22

> [!success]
> CLI oversized `tests/session-collector.test.ts`에서 agent session ownership/discovery coverage를 focused suite로 분리했다. Production/runtime 동작 변경 없이 full CLI suite 848 tests를 통과했다.

## Scope

- 대상 repo: `agentfeed-cli`
- Code commit:
  - `e0e1e74 Split CLI session collector ownership discovery tests`
- 변경 파일:
  - `tests/session-collector.test.ts`
  - `tests/session-collector-ownership-discovery.test.ts`
- 신규 앱 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: CLI contract test decomposition / session ownership and discovery suite isolation

## Background

[[CLI Codex Command Session Collector Metrics Test Split 2026-06-22]] follow-up에 남아 있던 `tests/session-collector.test.ts` oversized state 중 session ownership/discovery cluster를 처리했다. 이번 pass는 structured cwd ownership, cwd-less auto-discovery boundaries, explicit session attribution, relative session-file resolution, and explicit Codex sniffing coverage만 purpose-named suite로 이동했다.

## Changes

- `tests/session-collector-ownership-discovery.test.ts` 추가.
  - Structured cwd fields 기준 session ownership 판별 계약을 보존했다.
  - Explicit session file이 다른 project cwd를 가리키면 수집하지 않는 계약을 보존했다.
  - Claude cwd-less session auto-discovery가 project-scoped transcript directory로 제한되는 계약을 보존했다.
  - Codex cwd-less global session auto-discovery가 ambiguous attribution으로 차단되는 계약을 보존했다.
  - Explicit cwd-less Codex session file은 user attribution signal로 유지되는 계약을 보존했다.
  - Gemini cwd-less auto-discovery가 `.project_root`에 bound 되는 계약을 보존했다.
  - Subdirectory invocation에서 relative session file path를 invocation cwd 기준으로 해석하는 계약을 보존했다.
  - Explicit Codex session file이 source 없이 들어와도 Codex로 auto-detect 되는 계약을 보존했다.
  - Codex auto-discovery disabled 상태에서도 explicit Codex session file을 sniff하는 계약을 보존했다.
- `tests/session-collector.test.ts`에서 ownership/discovery cluster test cases를 제거했다.
- Production/runtime code는 변경하지 않았다.

## Verification Evidence

```text
Baseline before split: npm test -- --run tests/session-collector.test.ts -t "structured cwd fields|structured cwd belongs|cwd-less Claude|cwd-less Codex|explicit cwd-less Codex|Gemini auto-discovery bound|relative session files|auto-detects Codex|sniffs an explicit Codex": 1 file / 9 tests passed / 37 skipped
Filtered split: npm test -- --run tests/session-collector.test.ts tests/session-collector-ownership-discovery.test.ts -t "structured cwd fields|structured cwd belongs|cwd-less Claude|cwd-less Codex|explicit cwd-less Codex|Gemini auto-discovery bound|relative session files|auto-detects Codex|sniffs an explicit Codex": 1 file passed / 1 skipped, 9 tests passed / 37 skipped
Targeted split: npm test -- --run tests/session-collector.test.ts tests/session-collector-ownership-discovery.test.ts: 2 files / 46 tests passed
Typecheck: npm run typecheck: passed
Build: npm run build: passed
Full CLI suite: npm test -- --run: 166 files / 848 tests passed
Git whitespace: git diff --check and git diff --staged --check: passed
Static/no-excuse scan: no as any/as unknown/@ts-ignore/@ts-expect-error/non-null/catch escape hatch hits in the new ownership/discovery suite.
LSP diagnostics: unavailable because MCP LSP transport closed; `tsc --noEmit` passed as fallback.
```

Changed-file LOC/no-excuse audit:

```text
tests/session-collector.test.ts: 826 pure LOC after split; still oversized.
tests/session-collector-ownership-discovery.test.ts: 162 pure LOC.
```

## Follow-up

> [!success]
> Session file guardrail/pathological rows split completed in [[CLI Session Collector File Guardrail Test Split 2026-06-22]] with code commit `6345dc6`. `tests/session-collector.test.ts` is now 740 pure LOC after the follow-up split.

> [!todo]
> `tests/session-collector.test.ts` remains oversized at 740 pure LOC. Continue only by cohesive behavior clusters such as remaining draft integration, enabled agent config / auto aggregation, Gemini metrics, OMX/generic metadata, or collection window filtering. Preserve baseline coverage before each split.
