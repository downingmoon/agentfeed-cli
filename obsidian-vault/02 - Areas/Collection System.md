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
- [ ] Docker 기반 local E2E smoke success path 재검증

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
> 현재 로컬에는 Cursor 기본 저장 경로가 없어 실제 workspace/session format을 더 분석하지 못했습니다.

확인한 경로:

- `/Users/downing/Library/Application Support/Cursor/User/workspaceStorage`
- `/Users/downing/.cursor`
- `AgentFeed-CLI/.cursor`

현재 대응:

- 명시적 `--session-file` 또는 project-local `.cursor/*.json|jsonl|log`는 low-quality generic metadata로 수집
- raw Cursor transcript parser는 확인 가능한 실제 sample이 생길 때까지 보수적으로 보류
- `agentfeed doctor` / `collect --source cursor --explain`로 low-quality 근거와 수동 session-file 경로를 안내
