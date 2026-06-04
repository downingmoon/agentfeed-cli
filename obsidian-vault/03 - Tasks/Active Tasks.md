---
title: Active Tasks
aliases:
  - AgentFeed 다음 작업
  - CLI TODO Board
status: active
tags:
  - agentfeed/todo
  - project/tasks
updated: 2026-06-04
---

# Active Tasks

## 현재 결론

로컬 소스/CI/contract hardening은 대부분 완료됐다. 다음 병목은 **실제 hosted deployment/domain/OAuth evidence**다.

> [!warning] 중요 정정
> `agentfeed.dev`는 아직 준비된 도메인이 아니다. 더 이상 release blocker를 `agentfeed.dev DNS 실패`로 기록하지 않는다. 실제 도메인을 고른 뒤 hosted readiness를 실행해야 한다.

## P0 — 실제 배포/상용 readiness

- [ ] 실제 Frontend domain 결정.
- [ ] 실제 Backend API domain 결정.
- [ ] Backend production/staging env 구성:
  - `DATABASE_URL` TLS
  - `SECRET_KEY`
  - `FRONTEND_URL`
  - `ALLOWED_ORIGINS`
  - `API_ALLOWED_HOSTS`
  - `TRUSTED_PROXY_IPS`
  - GitHub OAuth env
- [ ] Frontend deployment env 구성:
  - `NEXT_PUBLIC_API_URL`
  - optional `AGENTFEED_HOSTED_FRONTEND_URL`
- [ ] GitHub OAuth App callback을 실제 Backend callback URL로 설정.
- [ ] `make smoke-hosted-compatibility`를 실제 URL로 통과.
- [ ] `make smoke-oauth-live`를 operator 승인으로 통과.
- [ ] `make commercial-readiness`가 `COMMERCIAL_READINESS_PASSED` 출력.

## P1 — Public release 준비

- [ ] CLI `package.json.homepage`가 실제 domain 또는 GitHub/docs URL을 가리키도록 정리.
- [ ] `license: UNLICENSED` 유지 여부 결정. public npm 배포 전 정책 확정.
- [ ] npm package 이름/README/install command 최종 확인.
- [ ] Frontend landing copy의 `agentfeed preview --remote` 같은 현재 없는/혼동 가능한 명령어 문구 점검.
- [ ] Backend integration guide의 예시 command가 현재 CLI 명령과 일치하는지 점검.

## P2 — 운영/문서 품질

- [x] Obsidian 완료 작업 로그 rollup 및 노이즈 제거.
- [ ] 실제 배포 후 [[Runtime Configuration]]에 production URL/환경 예시 추가.
- [ ] commercial readiness evidence artifact 위치와 재실행 절차를 운영 runbook으로 분리.
- [ ] 사용자용 quick-start 문서와 개발자용 runbook 분리.

## 완료 요약

완료된 대량 hardening 항목은 [[Commercial Readiness Completed Summary 2026-06-04]]에 통합했다.
