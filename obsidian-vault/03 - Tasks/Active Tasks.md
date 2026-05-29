---
title: Active Tasks
aliases:
  - AgentFeed 다음 작업
  - CLI TODO Board
tags:
  - agentfeed/todo
  - project/tasks
status: active
created: 2026-05-30
---

# Active Tasks

## P0 / 검증

- [x] Review 화면에서 collection quality/source evidence 노출
- [x] Docker 없이 가능한 static gate 보강: `smoke-e2e.sh` syntax + Alembic offline migration chain
- [ ] Docker daemon 실행 후 `agentfeed-dev`에서 `make smoke-e2e` 성공 경로 확인
- [ ] CLI → Backend → Frontend review/publish/feed 수동 smoke 재확인

## P1 후보

- [x] `share --note`를 Backend 별도 필드로 승격할지 API 계약 결정
- [x] review URL clipboard Linux fallback(`wl-copy`, `xsel`) 보강
- [x] 실제 Codex session schema 기반 tool call / subagent / agent turn 과소집계 보강
- [x] 실제 Claude/Gemini session schema 기반 turn / skill / Task subagent 과소집계 보강
- [x] `.obsidian` / `.DS_Store` 로컬 런타임 파일 수집 노이즈 제거
- [x] explicit `--session-file`이 다른 project 로그일 때 metrics 혼입 방지
- [x] 하위 디렉터리 실행 시 relative `--session-file` 경로 오해석 방지
- [x] Codex/OMX session id 불일치 metrics 오염 방지
- [x] generic/Cursor 증분 window에서 timestamp 없는 row 반복 집계 방지
- [x] 실제 Cursor workspace/session format 추가 조사 후 parser 품질 상향 가능성 판단
- [x] CLI ingest `worklog.model` → Backend 저장 → Frontend 노출 계약화

## P2 후보

- [x] 비용 정보는 추정 금지 원칙 유지, explicit cost field만 opt-in 보존
- [x] `doctor` 출력에 source별 개선 가이드 더 구체화
- [x] privacy redaction dry-run 상세 표시

## 관련 링크

- [[CLI Product Improvements Roadmap#남은 P1 후보]]
- [[Collection System#체크포인트]]
- [[Collection System#Doctor 진단 UX]]
- [[Collection System#비용 수집 정책]]
- [[Privacy Safety#Redaction dry-run UX]]
- [[Integration - CLI Backend Frontend#2026-05-30 Review evidence 계약]]
- [[Integration - CLI Backend Frontend#남은 검증 리스크]]
- [[Integration - CLI Backend Frontend#2026-05-30 Clipboard fallback 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 user_note 계약]]
- [[Integration - CLI Backend Frontend#2026-05-30 E2E smoke gate 보강]]
- [[Integration - CLI Backend Frontend#2026-05-30 test-all gate 보강]]
- [[Integration - CLI Backend Frontend#2026-05-30 worklog.model ingest 계약]]
- [[Collection System#2026-05-30 Collection hardening pass]]
- [[Collection System#2026-05-30 Session file project guard]]
- [[Collection System#2026-05-30 Local runtime noise 필터]]
- [[Collection System#2026-05-30 Claude/Gemini turn metrics 보강]]
- [[Collection System#2026-05-30 Codex tool metrics 보강]]
- [[Collection System#2026-05-30 Cursor 실제 저장소 조사]]
