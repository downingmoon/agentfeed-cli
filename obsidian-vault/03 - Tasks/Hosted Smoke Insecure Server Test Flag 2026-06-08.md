---
title: Hosted Smoke Insecure Server Test Flag 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/dev
  - agentfeed/deploy
  - agentfeed/testing
aliases:
  - Hosted smoke insecure flag
---

# Hosted Smoke Insecure Server Test Flag 2026-06-08

## 결론

개인 서버 IP-only 재배포 후 `make smoke-hosted-compatibility`의 Frontend diagnostic probe가 실패했다. 실제 Backend metadata와 Frontend contract는 일치했지만, smoke script가 IP-only `http://161.33.171.81` 테스트 허용 의도를 Frontend compatibility child process에 전달하지 않아 `review_base_url` normalization이 fail-closed 됐다.

> [!success] 수정 완료
> `agentfeed-dev/scripts/smoke-hosted-compatibility.sh`가 `AGENTFEED_ALLOW_INSECURE_API=1`을 받으면 Frontend diagnostic child process에도 `AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1` / `NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1`로 전달하도록 보강했다.

## 수정 범위

- `agentfeed-dev/scripts/smoke-hosted-compatibility.sh`
  - `INSECURE_SERVER_TEST_FLAG`를 도입해 기존 server-test specific flag 또는 `AGENTFEED_ALLOW_INSECURE_API`를 smoke 전체에서 공유.
  - CLI doctor child process에도 `AGENTFEED_ALLOW_INSECURE_API`를 명시 전달.
  - Frontend diagnostic compatibility helper에 hosted frontend URL과 server-test insecure flags를 명시 전달.

## 검증 evidence

- Dev script syntax
  - `bash -n scripts/smoke-hosted-compatibility.sh`
  - 결과: 통과.
- 개인 서버 재기동
  - `make server-up`
  - 결과: postgres/backend/frontend healthy, backend `0.0.0.0:18080`, frontend `0.0.0.0:13030`.
- Hosted compatibility smoke
  - `AGENTFEED_ALLOW_INSECURE_API=1 AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 make smoke-hosted-compatibility`
  - 결과: `HOSTED_COMPATIBILITY_SMOKE_PASSED`.

## 관련 노트

- [[Personal Server Deploy Smoke 2026-06-08]]
- [[Runtime Configuration]]
- [[Active Tasks]]
