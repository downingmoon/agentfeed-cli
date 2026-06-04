---
title: AgentFeed Vault Home
tags:
  - agentfeed
  - obsidian/vault
status: active
updated: 2026-06-04
---

# AgentFeed Vault Home

이 Vault는 AgentFeed의 **현재 제품 상태, 3개 제품 레포 통합 계약, 로컬/상용 readiness 기준**만 남긴 운영 문서입니다.

> [!important] 현재 기준
> `agentfeed.dev`는 아직 준비된 도메인이 아닙니다. 다음 실제 단계는 DNS 없이 **개인 서버 IP-only로 Frontend/Backend server smoke**를 수행하는 것입니다. Hosted/commercial readiness는 실제 production URL과 OAuth/live evidence가 준비된 뒤 별도로 실행합니다.

## 바로 볼 문서

- [[AgentFeed CLI MOC]] — 전체 지도
- [[AgentFeed Current Product Brief]] — 현재 제품/레포/명령 요약
- [[Integration - CLI Backend Frontend]] — CLI → Backend → Frontend 계약
- [[Collection System]] — agent session/git/test evidence 수집 정책
- [[Auth & Credential Safety]] — browser login/token/keychain 안전 정책
- [[Privacy Safety]] — redaction/private review/publish gate
- [[Runtime Configuration]] — local/dev/IP-only/hosted env 기준
- [[Active Tasks]] — 현재 남은 작업/parking lot
- [[Human Action Checklist]] — 사람이 직접 결정/처리해야 하는 일
- [[Commercial Readiness Completed Summary 2026-06-04]] — 삭제한 완료 로그들의 통합 요약

## 문서 운영 정책

- 작업 기록은 Obsidian Markdown frontmatter + wikilink를 사용한다.
- 완료된 세부 작업 로그는 장기 보관하지 않고 rollup 문서로 통합한다.
- 기본 문서는 항상 최신 소스 기준으로 유지한다.
- 실제 도메인이 정해지기 전에는 hosted URL을 placeholder 이상으로 취급하지 않는다.
- IP-only 테스트는 production readiness가 아니라 server smoke로 기록한다.

## 레포 위치

- CLI: `/Users/downing/PersonalProjects/AgentFeed-CLI`
- Backend: `/Users/downing/PersonalProjects/agentfeed-backend`
- Frontend: `/Users/downing/PersonalProjects/agentfeed-frontend`
- Dev orchestration: `/Users/downing/PersonalProjects/agentfeed-dev`
