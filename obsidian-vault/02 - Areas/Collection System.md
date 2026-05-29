---
title: Collection System
aliases:
  - AgentFeed 수집 시스템
  - CLI Collection
tags:
  - agentfeed/cli
  - agentfeed/collection
status: active
created: 2026-05-30
---

# Collection System

> [!abstract] 목적
> `agentfeed collect` / `agentfeed share`가 로컬 작업을 과장하지 않고, 누락하지 않고, 공개 가능한 범위로 요약하는 것이 핵심입니다.

## 수집 품질 원칙

- raw transcript / raw diff는 업로드하지 않는다.
- token, command, tool call, changed file evidence는 가능한 한 session window 안으로 제한한다.
- structured `cwd`가 현재 project root와 맞지 않는 session file은 명시적으로 전달되어도 수집하지 않는다.
- `.agentfeed`, `.omx`, `.omc`, `.cursor`, `.codex`, `.claude`, `.gemini` 같은 agent/plugin metadata는 공개 changed-file evidence에서 제외한다.
- `.DS_Store`, `Thumbs.db`, `.obsidian` 같은 로컬 OS/editor runtime 파일은 작업 evidence에서 제외한다.
- Cursor/generic metadata는 공식 transcript parser가 아니므로 `low` quality로 표시한다.
- 비용은 모델 가격표로 추정하지 않고 source/OMC/OMX/plugin metadata가 명시한 USD cost만 보존한다.
- `collection.include_estimated_cost=true`가 아니면 명시적 cost도 draft/upload metrics에 노출하지 않는다.
- high-quality source가 없으면 사용자가 `agentfeed doctor` 또는 `--session-file`로 개선할 수 있어야 한다.
- CLI 파일 인자(`--session-file`)는 프로젝트 루트가 아니라 사용자가 명령을 실행한 cwd 기준으로 해석한다.
- plugin metadata는 session id가 맞는 경우에만 high-quality agent session에 병합한다.
- generic/Cursor metadata는 증분 `since` window에서 timestamp 없는 row를 제외해 반복 집계를 피한다.
- `agentfeed doctor`는 source별 품질 기대치, 추천 `collect --source ... --explain` 명령, 플러그인 역할, 감지된 경로를 함께 보여줘야 한다.

## 증거 소스

| Source | 품질 | 메모 |
| --- | --- | --- |
| Claude Code session | high | tool use, token, command, file edit, Task subagent, agent turn 파싱 |
| Codex session | high | token delta, command, patch evidence, non-shell tool call, subagent, agent turn 파싱 |
| Gemini session | high | tool call, token, duration, Superpowers skill signal, agent turn 파싱 |
| OMC/OMX/Superpowers metadata | medium | plugin metadata 보강 |
| Cursor/generic metadata | low | 프로젝트 로컬 JSON/JSONL/log의 보수적 파싱 |
| Git diff/status | unknown | agent evidence가 없을 때 최소 changed area 보강 |

## 비용 수집 정책

> [!warning] 추정 금지
> AgentFeed CLI는 현재 가격표를 사용해 비용을 계산하지 않는다. 가격표는 자주 바뀌므로, 비용 필드는 source가 명시적으로 제공한 값만 사용한다.

- 허용 입력 예: `estimated_cost_usd`, `cost_usd`, `total_cost_usd`, `cost.usd`, `billing.totalUsd`
- 수집 대상: Claude/Codex/Gemini session row, generic metadata, OMC session metadata, OMX metrics metadata
- 노출 조건: `.agentfeed/config.json`의 `collection.include_estimated_cost=true`
- 기본값: `false`, 따라서 public draft/upload payload에는 `estimated_cost_usd: null`

## Doctor 진단 UX

> [!tip] 목표
> 사용자가 "왜 수집 품질이 낮지?"를 문서 검색 없이 터미널에서 바로 알 수 있어야 한다.

`agentfeed doctor`의 agent signal 영역은 각 source마다 다음을 제공한다.

- 감지 여부: `detected` / `not found`
- 품질 기대치: high / medium / low의 원인
- 바로 실행 가능한 명령:
  - `agentfeed collect --source claude-code --explain`
  - `agentfeed collect --source codex --explain`
  - `agentfeed collect --source cursor --explain`
  - `agentfeed collect --source gemini-cli --explain`
- default discovery가 실패했을 때 `--session-file <path>` 재시도 안내
- OMC/OMX/Superpowers가 어떤 base agent evidence를 보강하는지
- 감지된 path 최대 3개

## 관련 원본

- [[CLI Product Improvements Roadmap#P0. 수집 정확도 / 세션 슬라이싱]]
- [[AgentFeed Local CLI MVP Spec v0.2#14. Agent Session Collector]]
- [[AgentFeed Local CLI MVP Spec v0.2#15. Token / Cost Collector]]

## 체크포인트

- [x] collection window / idle gap 기반 slicing
- [x] duplicate fingerprint guard
- [x] git dirty diff + session changed files 병합
- [x] agent metadata path filter
- [x] explicit source cost opt-in 보존
- [x] doctor source별 수집 개선 가이드
- [x] Codex non-shell tool call / subagent / agent turn metrics 보강
- [x] Claude/Gemini agent turn, Claude Task subagent, Gemini `skill_name` skill signal 보강
- [x] Obsidian runtime / OS metadata가 git/session evidence에 섞이지 않도록 필터링
- [x] 잘못된 project의 explicit `--session-file` metrics 혼입 방지
- [x] 하위 디렉터리 실행 시 relative `--session-file` 경로를 invocation cwd 기준으로 해석
- [x] Codex/OMX session id 불일치 시 다른 세션의 subagent/turn metrics 병합 방지
- [x] generic/Cursor metadata 증분 window에서 timestamp 없는 row 제외
- [x] Codex mixed `apply_patch` / `patch_apply_end` evidence에서 fallback-only 파일 누락 방지
- [x] `uv run pytest`, `python -m pytest`, `make test` 같은 wrapped test command 인식
- [x] generic/Cursor metadata의 `created_at`, `createdAt`, `ts` timestamp alias window 필터링
- [x] staged diff와 untracked text file의 git line stats 누락 방지
- [x] explicit `--session-file` source sniff가 agent config disabled 상태에도 동작
- [x] Codex `turn_context.payload.model`에서 model 누락 없이 수집
- [ ] Docker 기반 local E2E smoke success path 재검증

## 2026-05-30 Codex turn_context model 수집

> [!success]
> 실제 Codex CLI 로그에서 모델명은 `session_meta.payload.model`이 아니라 `turn_context.payload.model`에 들어오는 경우가 많아, draft/review/detail에 모델명이 비어 보이는 문제를 막았습니다.

근거:

- 로컬 실제 Codex session JSONL을 content 없이 key/type 수준으로 확인했습니다.
- 최근 session의 `session_meta.payload`에는 `id`, `cwd`, `cli_version` 등은 있지만 `model`이 없었습니다.
- 같은 session의 `turn_context.payload`에는 `model`, `effort`, `cwd`가 있었습니다.

수정:

- Codex parser가 `session_meta.payload.model`을 우선 유지합니다.
- 값이 없으면 `turn_context.payload.model`을 session model로 보존합니다.
- raw prompt/transcript content는 읽거나 업로드하지 않고 schema key 기반 evidence만 사용합니다.

검증:

- `extracts Codex model from turn_context rows when session_meta omits it` 회귀 테스트
- `npm test -- tests/session-collector.test.ts --run -t "extracts Codex model from turn_context"`
- `npm test -- tests/session-collector.test.ts --run`
- `npm test -- tests/cli-collect.test.ts tests/share.test.ts --run`
- `npm run build`
- `npm test -- --run`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Explicit session-file source sniff

> [!success]
> 사용자가 `agentfeed collect --session-file <path>`만 제공해도 Codex/Gemini/Claude session shape를 sniff해서 올바른 source로 수집합니다.

문제:

- 기존 auto source 선택은 `.agentfeed/config.json`에서 enabled인 agent만 먼저 시도했습니다.
- `agentfeed init` 시점에 Codex/Gemini 신호가 감지되지 않아 disabled로 저장된 프로젝트에서는 사용자가 Codex session file을 직접 넘겨도 `claude_code` git-only draft처럼 보일 수 있었습니다.
- 이 경우 사용자가 "직접 session 파일까지 줬는데 왜 수집이 약하지?"라고 느끼는 핵심 UX 결함이 됩니다.

수정:

- 명시적 `--session-file`이 있을 때는 enabled source를 먼저 존중합니다.
- enabled source가 매칭되지 않으면 structured parser를 가진 `claude_code`, `codex`, `gemini_cli`를 추가로 sniff합니다.
- Cursor/generic shape는 애매하므로 path가 `.cursor` 아래이거나 config에서 cursor가 enabled인 경우만 cursor로 처리하고, 나머지는 기존 `other` fallback을 유지합니다.

검증:

- `sniffs an explicit Codex session file even when Codex auto discovery is disabled` 회귀 테스트
- `npm test -- tests/session-collector.test.ts --run -t "sniffs an explicit Codex session file"`
- `npm test -- tests/session-collector.test.ts --run`
- `npm test -- tests/git-draft.test.ts tests/duplicate-draft.test.ts --run`
- `npm run build`
- `npm test -- --run`
- `../agentfeed-dev/scripts/test-all.sh`

## 2026-05-30 Git evidence 라인 카운트 보강

> [!success]
> `agentfeed collect`가 agent session 없이 git dirty state만 보는 경우에도 staged change와 untracked text file의 line stats를 더 정확히 계산합니다.

문제:

- 기존 `git diff --numstat`는 unstaged diff만 계산합니다.
- 사용자가 이미 `git add`한 staged 변경은 changed file로는 보이지만 `lines_added` / `lines_removed`가 `null`로 남았습니다.
- untracked text file도 changed file로만 보이고 additions가 빠졌습니다.

수정:

- `git diff --numstat` + `git diff --cached --numstat`를 합산합니다.
- 같은 path가 staged/unstaged 양쪽에 있으면 line count를 누적합니다.
- untracked added file은 1MB 이하 UTF-8 text file에 한해 로컬에서 line count만 계산하고 content는 draft/upload payload에 포함하지 않습니다.

검증:

- staged modified file 회귀 테스트
- untracked text file 회귀 테스트
- `npm test -- tests/git-draft.test.ts --run`
- `npm run build`

## 2026-05-30 Collection hardening pass

> [!success]
> 실제 사용자가 repo 하위 폴더에서 CLI를 실행하거나, 여러 Codex/OMX 세션이 같은 프로젝트에 누적된 상황에서도 수집 지표가 다른 경로/세션과 섞이지 않도록 보강했습니다.

### Invocation cwd 기준 `--session-file`

- 문제: `agentfeed collect`를 `src/` 같은 하위 디렉터리에서 실행하면 `--session-file ../session.jsonl`이 project root 기준으로 잘못 resolve될 수 있었습니다.
- 결정: 사용자가 입력한 파일 경로는 명령 실행 cwd 기준으로 먼저 absolute path로 만든 뒤 project root collector에 전달합니다.
- 검증: `collectDraft({ cwd: <repo>/src, sessionFile: '../codex-subdir-session.jsonl' })` 회귀 테스트.

### OMX session id isolation

- 문제: `.omx/state/subagent-tracking.json`에 현재 Codex `session_id`가 없으면 첫 번째 session tracking을 fallback으로 병합할 수 있었습니다.
- 결정: Codex session id가 명확하면 OMX tracking도 같은 key/session_id일 때만 subagent/turn/mode metrics에 병합합니다. session id가 없는 legacy 상황에서만 기존 fallback을 허용합니다.
- 검증: `other-codex-session` tracking이 있어도 `codex-current-session` draft에는 `agent_turns=1`, subagent/mode는 null.

### Generic metadata incremental window guard

- 문제: `other`/`cursor` generic metadata가 `--since` window 안에서 timestamp 없는 row를 항상 포함해 과거 metrics를 반복 집계할 수 있었습니다.
- 결정: `since`가 있는 증분 수집에서는 timestamp 없는 generic row를 제외합니다. 단, lower bound 없는 전체/초기 generic 수집에서는 보수적 호환성을 위해 timestamp 없는 row를 계속 허용합니다.
- 검증: timestamp 없는 stale row와 timestamp 있는 fresh row가 섞인 JSONL에서 fresh row만 집계.

## 2026-05-30 Session file project guard

> [!success]
> 사용자가 `--session-file`을 직접 지정하더라도, 파일 내부 structured `cwd`가 현재 project root와 맞지 않으면 token/tool/test metrics를 수집하지 않습니다.

- Claude: top-level `cwd` 기준
- Codex: `payload.cwd` 기준
- structured cwd가 없으면 기존처럼 보수적으로 허용
- structured cwd가 하나라도 현재 project root 또는 하위 경로와 일치하면 허용
- structured cwd가 있지만 모두 다른 project이면 `null` session metrics로 처리

## 2026-05-30 Local runtime noise 필터

> [!success]
> 실제 CLI repo에서 Obsidian Vault를 열면 `.obsidian/*` 설정 파일과 `.DS_Store`가 dirty 상태로 남을 수 있습니다. 이 파일들은 사용자의 제품 작업이 아니므로 AgentFeed 수집 evidence에서 제외합니다.

반영한 기준:

- Git evidence는 `git status --porcelain -uall`로 untracked directory를 파일 단위로 펼친 뒤 필터링
- `.DS_Store`, `Thumbs.db`는 어느 위치에 있어도 제외
- `.obsidian` directory 아래 파일은 vault 위치와 무관하게 제외
- agent session이 이런 파일을 changed file로 보고해도 public changed-file evidence와 fingerprint에서 제외

## 2026-05-30 Claude/Gemini turn metrics 보강

> [!success]
> 실제 Claude/Gemini 로그 shape를 기준으로 command/file edit 외 작업량 지표가 누락되지 않도록 보강했습니다.

- Claude `assistant` row를 `agent_turns`로 집계
- Claude `Task` / `TaskCreate` tool use를 `subagents_spawned`로 집계
- Gemini `type=gemini` row를 `agent_turns`로 집계
- Gemini `activate_skill`의 `args.name`, `args.skill_name`, `args.skillName`을 모두 skill evidence로 인정

## 2026-05-30 Codex tool metrics 보강

> [!success]
> 실제 Codex session row에서 `exec_command`가 아닌 `update_plan`, `write_stdin`, `spawn_agent`, MCP/custom tool call이 많이 발생하므로 shell command만 tool call로 세면 수집 결과가 실제 작업보다 과소평가됩니다.

반영한 수집 기준:

- `response_item.payload.type=function_call`은 command 여부와 무관하게 `tool_calls`에 포함
- `exec_command`만 `commands_run` / `tests_run` / `failed_commands` 판정에 사용
- `spawn_agent` function call은 `subagents_spawned`로 집계
- `event_msg.payload.type=agent_message`는 `agent_turns`로 집계
- `mcp_tool_call_end`와 `custom_tool_call`도 tool usage evidence로 집계
- `patch_apply_end`가 없는 session에서는 `apply_patch` custom tool input을 fallback으로 파싱해 changed file/line evidence를 복구

## 2026-05-30 Cursor 실제 저장소 조사

> [!warning]
> 2차 확인에서도 현재 로컬에는 Cursor 기본 저장 경로와 실행 프로세스가 없어 실제 workspace/session format을 더 분석하지 못했습니다.

확인한 경로:

- `/Users/downing/Library/Application Support/Cursor/User/workspaceStorage`
- `/Users/downing/.cursor`
- `/Users/downing/.config/Cursor`
- `AgentFeed-CLI/.cursor`
- `$HOME` 하위 2-depth `*cursor*` directory
- macOS process list의 Cursor app process

현재 대응:

- 명시적 `--session-file` 또는 project-local `.cursor/*.json|jsonl|log`는 low-quality generic metadata로 수집
- raw Cursor transcript parser는 확인 가능한 실제 sample이 생길 때까지 보수적으로 보류
- `agentfeed doctor` / `collect --source cursor --explain`로 low-quality 근거와 수동 session-file 경로를 안내

> [!note]
> 판단: 검증 가능한 sample 없이 Cursor 전용 parser를 추정 구현하면 잘못된 metrics를 만들 위험이 더 큽니다. 현재는 generic metadata 수집을 유지하고, 실제 Cursor workspace sample이 생기면 별도 회귀 fixture를 먼저 만든 뒤 parser 품질을 올립니다.

## 2026-05-30 Codex mixed patch evidence 보강

> [!success]
> Codex session 안에 `custom_tool_call.apply_patch` fallback evidence와 `patch_apply_end` structured evidence가 함께 있을 때, structured evidence가 하나라도 있다는 이유로 fallback-only 파일을 버리지 않도록 수정했습니다.

문제:

- 이전 로직은 `patch_apply_end`가 세션에 하나라도 있으면 모든 `apply_patch` fallback text를 무시했습니다.
- 긴 Codex 세션이나 mixed tool trace에서는 어떤 patch는 structured event가 있고, 다른 patch는 fallback text만 남을 수 있습니다.
- 이 경우 fallback-only 파일의 `changed_files`, `lines_added`, `lines_removed`가 누락됩니다.

수정:

- 각 fallback patch를 임시 changed-file map으로 파싱합니다.
- structured evidence에 이미 같은 path가 있으면 중복 방지를 위해 skip합니다.
- structured evidence에 없는 path만 병합해 누락을 막습니다.

검증:

- `codex-mixed-patch-evidence` 회귀 테스트 추가
- `npm test -- tests/session-collector.test.ts --run`
- `npm run build`

## 2026-05-30 Wrapped test command 인식 보강

> [!success]
> 실제 Python/Make 기반 프로젝트에서 자주 쓰는 wrapped test command가 `tests_run` / `tests_passed` 집계에서 빠지지 않도록 보강했습니다.

추가 인식:

- `uv run ... pytest`
- `python -m pytest`
- `python3 -m pytest`
- `python -m unittest`
- `make test`
- `make test-*` / `make *test*`
- `pnpm exec vitest`, `yarn exec jest`, `bun exec vitest`

검증:

- `codex-wrapped-test-commands` 회귀 테스트 추가
- `npm test -- tests/session-collector.test.ts --run`
- `npm run build`

## 2026-05-30 Generic timestamp alias 보강

> [!success]
> Cursor/generic/plugin metadata가 ISO `timestamp` 대신 `created_at`, `createdAt`, `updated_at`, `updatedAt`, `time`, `ts` 또는 numeric epoch를 쓰는 경우에도 collection window가 올바르게 적용되도록 보강했습니다.

문제:

- 증분 수집에서는 timestamp가 없다고 판단한 row를 제외합니다.
- 하지만 실제 metadata exporter는 `timestamp`가 아니라 `created_at`/`createdAt`/`ts`를 쓰는 경우가 많습니다.
- 이 alias를 모르면 fresh row까지 timestamp-less로 오해해 수집에서 제외할 수 있습니다.

수정:

- row timestamp 파서가 common alias를 순서대로 확인합니다.
- numeric epoch는 millisecond/second 단위를 구분해 millisecond로 정규화합니다.
- 기존 ISO timestamp 동작은 유지합니다.

검증:

- `generic-window-timestamp-aliases` 회귀 테스트 추가
- `npm test -- tests/session-collector.test.ts --run`
- `npm run build`
