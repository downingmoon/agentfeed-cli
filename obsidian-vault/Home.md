---
title: AgentFeed CLI Vault
tags:
  - agentfeed
  - obsidian/vault
status: active
created: 2026-05-30
---

# AgentFeed CLI Vault

> [!tip] 열기
> Obsidian에서 `AgentFeed-CLI/obsidian-vault` 폴더를 **Open folder as vault**로 열면 됩니다.


## 문서 작성 정책

> [!important]
> 앞으로 AgentFeed 작업 문서, TODO, 분석/검증 기록은 `obsidian-vault/`에 Obsidian Markdown 형식으로 작성합니다.

- 신규 작업 노트는 frontmatter(`title`, `tags`, `status`, `created`)를 포함합니다.
- 관련 문서는 [[AgentFeed CLI MOC]]와 [[Active Tasks]]에 wikilink로 연결합니다.
- 내부 문서 연결은 Markdown 링크 대신 `[[wikilink]]`를 우선 사용합니다.
- 강조가 필요한 결정/리스크/검증 결과는 Obsidian callout을 사용합니다.

## 시작점

- [[Commercial Readiness Hardening - Public Interaction Response Models 2026-05-31]] — public feed/discovery/social/comment response model coverage


- [[Commercial Readiness Hardening - Auth Identity Response Models and JSON Side Effects 2026-05-31]] — auth identity normalization, backend response models, CLI JSON side-effect contracts


- [[Commercial Readiness Hardening - Rate Limit Fallback Detail Payload Resilience and Credential Fallback Warning 2026-05-31]] — rate-limit fallback, detail/review payload resilience, credential fallback warning


- [[Commercial Readiness Hardening - OAuth Cookie Scope JSON Upload and Signout State 2026-05-31]] — OAuth cookie scope, JSON collect upload, metadata URI resilience, sign-out state reset


- [[Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31]] — browser-approved CLI token replacement and self-rotation shutdown

- [[Commercial Readiness Hardening - Profile Follow Hydration and Leaderboard Resilience 2026-05-31]] — profile follow hydration and leaderboard malformed-row resilience

- [[Commercial Readiness Hardening - Rate Limit and Privacy Finding Ownership 2026-05-31]] — backend random Bearer throttle and server-owned finding resolution

- [[Commercial Readiness Hardening - Settings Privacy Controls 2026-05-31]] — Settings default visibility and public metric controls

- [[Commercial Readiness Hardening - CLI Privacy Scanner Header and URL Redaction 2026-05-31]] — scanner authorization header and URL redaction

- [[Commercial Readiness Hardening - CLI Command and Token Trust Boundary 2026-05-31]] — configured command and argv token trust boundary

- [[Commercial Readiness Audit Followups 2026-05-31]] — backend/frontend/CLI audit follow-up backlog

- [[Commercial Readiness Hardening - Settings Named Token Creation 2026-05-31]] — Settings named ingestion token creation and one-time reveal

- [[Commercial Readiness Hardening - Dashboard Recent Worklog Actions 2026-05-31]] — Dashboard recent worklogs status-aware action route

- [[Commercial Readiness Hardening - Ingest Repository URL Safety 2026-05-31]] — Backend ingestion repository URL public-host validation

- [[Commercial Readiness Hardening - CLI Token Stdin Login 2026-05-31]] — CLI token login stdin-first hardening

- [[Commercial Readiness Hardening - Owner Aware Project Routes 2026-05-31]] — owner-aware project route로 slug collision/false 404 방지

- [[Commercial Readiness Hardening - Smoke User Note Privacy Contract 2026-05-31]] — smoke-e2e user_note public privacy 계약 정렬

- [[Commercial Readiness Hardening - Publish Privacy Severity Auth Smoke and Alembic Version Gate 2026-05-31]] — publish privacy severity fail-closed, CLI auth exchanged token smoke, Alembic version gate

- [[Commercial Readiness Hardening - Hydrated Browser Privacy Smoke 2026-05-31]] — hydrated browser public DOM privacy smoke

- [[Commercial Readiness Hardening - CLI Draft Artifact Permissions 2026-05-31]] — CLI draft JSON/Markdown private permission hardening

- [[Commercial Readiness Hardening - CLI Private Review Privacy Policy 2026-05-31]] — CLI private review upload와 public publish privacy gate를 명확히 표시

- [[Commercial Readiness Hardening - Feed Keyset and OAuth Hash Redirect 2026-05-31]] — aggregate feed keyset pagination, OAuth next hash preservation, docs command contract

- [[Commercial Readiness Hardening - Cross Platform Open Config Validation and Settings Partial Failure 2026-05-31]] — cross-platform review opener, backend host/proxy validation, settings partial-failure UX

- [[Commercial Readiness Hardening - Concurrent Notification Migration CLI Auth Smoke and Header Contracts 2026-05-31]] — concurrent notification migration, CLI auth smoke, Header contracts

- [[Commercial Readiness Hardening - Native Keychain Smoke Notification Gates and Social Action Contracts 2026-05-31]] — native keychain smoke, notification gates, optimistic social action contracts

- [[Commercial Readiness Hardening - Session Parser Bounds Notification Dedupe and Comment Contracts 2026-05-31]] — session parser bounds, notification dedupe, frontend comment/API contracts

- [[Commercial Readiness Hardening - Keychain Publish Race Leaderboard Scale and Frontend Contracts 2026-05-31]] — keychain, publish race, leaderboard scale, frontend contracts

- [[Commercial Readiness Hardening - CSRF Token Capture and Search Pagination 2026-05-30]] — CSRF Origin gate, one-time token capture, search pagination, CLI rotation recovery

- [[Commercial Readiness Hardening - Token Rotation UX 2026-05-30]] — token rotation API/CLI/settings UX hardening

- [[Commercial Readiness Audit 2026-05-30]] — 상용화 readiness 감사와 P1 보정 현황

- [[Commercial Readiness Hardening - Token Expiry Provenance and Feed UX 2026-05-30]] — token expiry, CLI provenance, feed/share UX hardening
- [[Commercial Readiness Hardening - Token Lifecycle and Settings Surface 2026-05-30]] — token lifecycle visibility and settings surface
- [[AgentFeed CLI MOC]] — 전체 문서 지도
- [[Collection System]] — 핵심 수집 파트 정리
- [[Privacy Safety]] — 공개 전 redaction / scan 안전장치
- [[Auth & Credential Safety]] — 로그인/token 저장 안전장치
- [[Runtime Configuration]] — runtime URL/env 정규화
- [[Integration - CLI Backend Frontend]] — 3개 레포 연동 상태
- [[Active Tasks]] — 다음 작업 후보

## 원본 문서 복사본

- [[AgentFeed CLI README]]
- [[AgentFeed Local CLI MVP Spec v0.2]]
- [[CLI Product Improvements Roadmap]]
- [[Cross Repo Integration Fixes]]

> [!warning] 동기화 정책
> 이 Vault는 프로젝트 문서의 Obsidian용 정리본입니다. 원본 `README.md`와 `docs/`가 canonical source이면, 변경 후 Vault 복사본도 다시 동기화하세요.
