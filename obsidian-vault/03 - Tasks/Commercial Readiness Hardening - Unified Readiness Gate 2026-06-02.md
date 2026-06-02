---
title: Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/dev
  - commercial-readiness
  - release-gate
  - smoke
status: done
aliases:
  - Unified commercial readiness gate
---

# Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02

관련 지도: [[AgentFeed CLI MOC]]  
관련 영역: [[Integration - CLI Backend Frontend]], [[Runtime Configuration]], [[Auth & Credential Safety]]

## 목표

상용화 완료를 잘못 주장하지 않도록 local cross-repo gate, hosted compatibility smoke, credentialed OAuth live smoke를 하나의 fail-closed release-readiness command로 묶는다.

> [!important] Acceptance
> - `make commercial-readiness`가 존재한다.
> - gate는 `./scripts/test-all.sh`, default `./scripts/smoke-hosted-compatibility.sh`, credentialed `./scripts/smoke-oauth-live.sh`를 모두 실행한다.
> - hosted/OAuth skip flag를 제공하지 않는다.
> - OAuth live smoke는 machine-readable evidence artifact를 쓸 수 있다.
> - default hosted DNS가 준비되지 않으면 gate는 non-zero로 실패한다.

## RED

- `./scripts/test-commercial-readiness-gate.sh`
  - 실패: `Missing expected file: scripts/commercial-readiness.sh`
  - 의미: 기존에는 `make test`, `make smoke-hosted-compatibility`, `make smoke-oauth-live`가 분리되어 있어 local green이 상용 readiness로 오해될 수 있었다.

## 변경

- `agentfeed-dev/Makefile`
  - `commercial-readiness` target 추가.
- `agentfeed-dev/scripts/commercial-readiness.sh`
  - full local cross-repo gate → hosted DNS/API compatibility smoke → credentialed OAuth live smoke 순서로 실행.
  - `.commercial-readiness-evidence/<run-id>/manifest.json` 작성.
  - 모든 단계 성공 시 `COMMERCIAL_READINESS_PASSED` 출력.
- `agentfeed-dev/scripts/smoke-oauth-live.sh`
  - `AGENTFEED_SMOKE_EVIDENCE_DIR` 지정 시 `oauth-live-evidence.json` 작성.
  - doctor API readiness/token validity, credential file permissions, token prefix/API base match를 machine-readable evidence로 남김.
- `agentfeed-dev/scripts/test-commercial-readiness-gate.sh`
  - source contract 추가.
- `agentfeed-dev/scripts/test-all.sh`
  - commercial readiness source contract 포함.
- `agentfeed-dev/README.md`
  - `make commercial-readiness`, `api.agentfeed.dev` DNS prerequisite, `smoke-oauth-live` evidence 설명 추가.
- `agentfeed-dev/.gitignore`
  - `.commercial-readiness-evidence/` ignore.

## Evidence

- [x] `./scripts/test-commercial-readiness-gate.sh`
  - `commercial readiness gate contract passed`
- [x] `./scripts/test-all.sh`
  - CLI 330 tests, Frontend CI/build/contracts/audit, Backend 292 tests, OpenAPI gate, Alembic offline chain 통과.
- [x] `AGENTFEED_COMMERCIAL_READINESS_EVIDENCE_DIR=$(mktemp -d) ./scripts/commercial-readiness.sh`
  - local cross-repo gate 통과 후 hosted DNS 단계에서 non-zero.
  - `manifest.json`: `status=failed`, `exit_code=1`, `required_steps=[test-all, smoke-hosted-compatibility, smoke-oauth-live]`.
  - 실패 메시지: `Hosted API host did not resolve: api.agentfeed.dev`
  - 결론: gate가 현재 external blocker를 false-green 처리하지 않고 failed manifest evidence를 남김.

> [!warning] 남은 release blocker
> `api.agentfeed.dev` DNS/deployment가 준비되고 default `make commercial-readiness`가 `COMMERCIAL_READINESS_PASSED`를 출력해야 상용화 완료를 주장할 수 있다.

## 병렬 감사 결과

- Dev gate 감사: unified one-command gate 부재가 concrete gap으로 확인되어 이번 변경으로 처리.
- Backend/Frontend hosted config 감사: DNS 외 확정 hosted blocker 없음. 다만 local CI는 production hosted 상태를 증명하지 못하므로 이번 unified gate가 release-readiness proof 경로를 분리한다.
