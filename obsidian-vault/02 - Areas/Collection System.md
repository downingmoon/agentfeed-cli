---
title: Collection System
aliases:
  - AgentFeed 수집 시스템
  - CLI Collection
status: active
tags:
  - agentfeed/cli
  - agentfeed/collection
updated: 2026-06-04
---

# Collection System

## 목표

`agentfeed collect/share`는 로컬 개발 흔적을 public-safe worklog draft로 만든다. 정확도가 부족한 경우 과장하지 않고 `collection_quality`/diagnostics로 드러낸다.

## 수집 소스

- Git diff/status/log, staged/untracked text file stats.
- Claude Code session/task/subagent/tool evidence.
- Codex CLI session/tool/subagent/turn context evidence.
- Antigravity session/skill/tool evidence.
- Cursor/generic metadata evidence.
- OMC/OMX/Superpowers 같은 plugin/runtime signal은 known adapter로 자동 감지하되, unknown plugin은 generic metadata로 보수 처리.
- configured test/build commands는 명시 flag가 있을 때만 실행.

## 안전 정책

- `collect` 기본 동작은 서버 업로드 없음.
- `share`/`collect --upload`/`publish` human upload는 terminal review 후 `yes` 입력 또는 명시적 `--yes`가 필요. JSON upload는 machine-readable intent로 취급한다.
- Shell wrapper command는 configured command로 거부한다.
- sensitive env는 configured command 실행 시 scrub한다.
- explicit `--session-file`은 project-bound/cwd 기준으로 해석한다.
- 실패한 tool call을 changed-file/subagent/test success로 과대집계하지 않는다.

## Draft contract

Local draft는 다음 축을 포함한다.

- `id`
- `source`: agent/source/window/fingerprint/local draft id
- `worklog`: title/summary/model/metrics/changed areas/outcome/timeline
- `privacy_scan`
- `privacy_policy`
- `upload`: uploaded/worklog id/review URL/uploaded_at/handoff

최근 보강: `source.created_at`, `source.collection_window.since/until`, `upload.uploaded_at` timestamp semantic validation.

## Daily commands

```bash
agentfeed collect --explain
agentfeed collect --source codex
agentfeed collect --source antigravity --session-file ./session.jsonl
agentfeed share
agentfeed share --yes --open-review
agentfeed share --run-configured-commands
```

관련: [[Privacy Safety]], [[Integration - CLI Backend Frontend]]
