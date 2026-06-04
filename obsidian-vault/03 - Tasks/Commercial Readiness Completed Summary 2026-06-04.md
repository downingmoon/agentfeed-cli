---
title: Commercial Readiness Completed Summary 2026-06-04
date: 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - project/summary
status: completed
aliases:
  - Commercial Readiness Rollup
---

# Commercial Readiness Completed Summary 2026-06-04

이 문서는 삭제된 개별 `Commercial Readiness Hardening - ...` 작업 로그들의 통합 요약이다.

## 완료된 큰 축

### CLI

- Browser login approval/exchange flow 하드닝.
- Token stdin login, unsafe argv token guard, logout/rotate/status/doctor 개선.
- macOS keychain, Windows DPAPI, file credential fallback policy 정리.
- Claude Code, Codex, Gemini CLI, Cursor, OMC/OMX/Superpowers signal 수집 확장.
- session/git/test evidence slicing, timestamp/window/filtering, failed tool overcount 방지.
- private review upload 명시 승인 `--yes`/JSON contract 강화.
- upload lock/cache/token/API/user binding, duplicate stale reuse, cursor safety 보강.
- review URL trust policy, metadata compatibility, split-host review origin 지원.
- npm release/prepack/provenance/action pin/Windows wrapper smoke 보강.

### Backend

- GitHub OAuth, CLI auth session, ingestion token lifecycle/rotation/revoke/status 안정화.
- ingestion idempotency, duplicate fingerprint, durable quota, byte/count limit, reset timestamp 보강.
- privacy scan fallback, blocking finding publish gate, safe public preview 정렬.
- feed/search/project/profile/dashboard/notification N+1 제거 및 aggregate query 보강.
- social actions, comments, reports, moderation, notification dedupe/audit coverage 보강.
- production env/secret/TLS/proxy/origin/API host fail-fast.
- health/readiness, rate-limit store, degraded metadata fallback, request id/audit trail 보강.

### Frontend

- Landing/feed/explore/profile/project/dashboard/settings/review 화면을 API-backed 계약으로 정렬.
- Worklog card/detail/review partial payload resilience 및 semantic controls/accessibility 개선.
- CLI authorize page retry/session status/logout recovery 보강.
- auth recovery, 401/session-expiry UX, no local signed-out illusion 보강.
- API URL normalization, production build env fail-closed, hosted readiness preflight/manual workflow 정리.
- review origin cross validation, stale `/login` root regression smoke, root smoke explicit URL 정책 보강.
- mock API compatibility, public endpoint probes, contract tests, dependency audit 통합.

### Dev orchestration

- `make setup/dev/up/wait/test/smoke-e2e/smoke-hosted-compatibility/commercial-readiness` 체계 구축.
- Docker Compose + native dev env, port conflict guidance, readiness evidence JSON 보강.
- cross-repo OpenAPI/schema/API-base parity gate.
- browser E2E smoke, OAuth contract/live smoke, hosted compatibility evidence artifact.
- commercial readiness manifest, branch policy, self-hosted evidence workflow.
- Hosted smoke는 이제 실제 URL 명시가 필수이며 기본 도메인을 가정하지 않는다.

## 폐기된 방향

- `agentfeed.dev`를 준비된 production domain으로 간주하는 정책은 폐기.
- Frontend push CI에서 없는 hosted domain을 기본으로 찌르는 정책은 폐기.
- 초기 MVP의 `agentfeed login --token <token>` literal argv UX는 보안상 폐기되고 stdin/browser login 중심으로 전환.
- mock-only Frontend surface는 대부분 실제 API contract로 전환.

## 아직 남은 축

자세한 남은 작업은 [[Active Tasks]] 참조.

- 실제 hosted Backend/Frontend 배포 URL 결정.
- production OAuth app/secrets 구성.
- `make commercial-readiness`를 실제 hosted URL + OAuth live evidence로 통과.
- public npm metadata/domain/license/release 정책 최종 확정.
