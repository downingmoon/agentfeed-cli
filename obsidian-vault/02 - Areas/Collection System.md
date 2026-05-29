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
- `.agentfeed`, `.omx`, `.omc`, `.cursor`, `.codex`, `.claude`, `.gemini` 같은 agent/plugin metadata는 공개 changed-file evidence에서 제외한다.
- Cursor/generic metadata는 공식 transcript parser가 아니므로 `low` quality로 표시한다.
- 비용은 모델 가격표로 추정하지 않고 source/OMC/OMX/plugin metadata가 명시한 USD cost만 보존한다.
- `collection.include_estimated_cost=true`가 아니면 명시적 cost도 draft/upload metrics에 노출하지 않는다.
- high-quality source가 없으면 사용자가 `agentfeed doctor` 또는 `--session-file`로 개선할 수 있어야 한다.

## 증거 소스

| Source | 품질 | 메모 |
| --- | --- | --- |
| Claude Code session | high | tool use, token, command, file edit 파싱 |
| Codex session | high | token delta, command, patch evidence 파싱 |
| Gemini session | high | tool call, token, duration, Superpowers signal 파싱 |
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
- [ ] Docker 기반 local E2E smoke success path 재검증
