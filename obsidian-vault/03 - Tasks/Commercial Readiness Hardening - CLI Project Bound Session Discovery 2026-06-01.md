---
title: Commercial Readiness Hardening - CLI Project Bound Session Discovery 2026-06-01
aliases:
  - CLI Project Bound Session Discovery
  - Agent Session Attribution Guard
  - Cwd-less Session Discovery Policy
tags:
  - agentfeed/cli
  - agentfeed/collection
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - CLI Project Bound Session Discovery 2026-06-01

## 목적

Claude/Codex/Gemini session 수집에서 structured `cwd`가 없는 transcript를 무조건 현재 프로젝트 작업으로 간주하지 않도록, default discovery와 explicit user attribution의 경계를 명확히 했습니다.

> [!important]
> 자동 discovery는 project-bound evidence가 있어야 합니다. 반대로 사용자가 `--session-file`로 직접 지정한 파일은 intentional attribution signal로 유지하되, structured `cwd`가 다른 프로젝트를 가리키면 계속 거부합니다.

## 수정 요약

- `discoverSessionFile()` 후보를 단순 path 목록이 아니라 attribution context가 있는 후보로 분리했습니다.
- Claude Code의 `~/.claude/projects/<encoded project cwd>/...` 경로는 project-scoped transcript directory로 인정해 structured `cwd`가 없는 legacy row도 자동 수집할 수 있습니다.
- Codex의 global `~/.codex/sessions`는 project-scoped 경로가 아니므로 structured `cwd` 없는 session을 자동 수집하지 않습니다.
- Explicit `--session-file` / API `sessionFile` 경로는 기존처럼 cwd-less Codex export를 수집할 수 있습니다.
- Gemini CLI 자동 discovery는 기존 `.project_root` file 기반 project binding을 유지합니다.

## 계약

- Structured `cwd`가 있으면 현재 project root 또는 하위 경로와 일치해야 합니다.
- Structured `cwd`가 다른 프로젝트면 explicit `sessionFile`이어도 수집하지 않습니다.
- Structured `cwd`가 없고 자동 discovery인 경우:
  - Claude project-scoped transcript directory는 허용합니다.
  - Codex global sessions directory는 거부합니다.
  - Gemini는 `.project_root`가 현재 project root와 일치할 때만 허용합니다.
- Structured `cwd`가 없고 explicit `sessionFile`인 경우, 사용자의 직접 지정 의사를 보존해 best-effort 수집합니다.

> [!warning]
> arbitrary transcript text, tool args, file path 문자열, shell `workdir`만으로 project ownership을 추론하지 않습니다.

## TDD 기록

> [!bug] RED
> `npm test -- --run tests/session-collector.test.ts -t "cwd-less"`를 먼저 실행했습니다. `auto-discovers cwd-less Claude sessions only from the project-scoped transcript directory`가 `expected undefined to be 'claude-project-dir-session'`로 실패했습니다.

> [!success] GREEN
> `sessionFileCanBeAutoDiscovered()`를 추가하고 Claude project-scoped candidate에만 `allowProjectScopedNoCwd`를 전달했습니다. 같은 targeted test가 통과했습니다.

> [!tip] Code review follow-up
> 병렬 code-review가 Gemini `.project_root` auto-discovery 직접 회귀 테스트 부재를 low-risk로 지적해, `keeps Gemini auto-discovery bound to .project_root for cwd-less session rows` 테스트를 추가했습니다.

## 검증 증거

- Targeted RED:
  - `npm test -- --run tests/session-collector.test.ts -t "cwd-less"`
  - 결과: `1 failed | 2 passed | 57 skipped`
- Targeted GREEN:
  - `npm test -- --run tests/session-collector.test.ts -t "cwd-less"`
  - 결과: `4 passed | 57 skipped`
- CLI session collector full:
  - `npm test -- --run tests/session-collector.test.ts`
  - 결과: `61 passed`
- CLI full gates:
  - `npm run typecheck` → passed
  - `npm run build` → passed
  - `npm test -- --run` → `268 passed`
  - `npm run release:preflight` → passed
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check` → clean
- Cross-repo gate:
  - `agentfeed-dev make test`
  - 결과: OpenAPI contract gate, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend ruff/pytest, Alembic offline migration chain 모두 통과

## 남은 리스크

> [!note]
> 실제 사용자 머신의 모든 Claude/Codex legacy transcript layout을 수집한 것은 아닙니다. 현재 정책은 false-positive 방지 우선이며, default discovery가 놓치는 파일은 `agentfeed collect --source ... --session-file <path> --explain`로 복구합니다.

## 관련 링크

- [[Collection System#2026-06-01 Project-bound cwd-less session discovery]]
- [[Active Tasks#P1 후보]]
