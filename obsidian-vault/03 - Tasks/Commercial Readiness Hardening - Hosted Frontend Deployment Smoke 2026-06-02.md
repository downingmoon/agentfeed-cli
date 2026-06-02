---
title: Commercial Readiness Hardening - Hosted Frontend Deployment Smoke 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/dev
  - commercial-readiness
  - hosted-smoke
  - frontend
status: done
aliases:
  - Hosted frontend deployment smoke
---

# Commercial Readiness Hardening - Hosted Frontend Deployment Smoke 2026-06-02

관련 지도: [[AgentFeed CLI MOC]]  
관련 영역: [[Integration - CLI Backend Frontend]], [[Runtime Configuration]]  
선행 노트: [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]]

## 목표

`make commercial-readiness`가 Backend/API compatibility만으로 false-green 되지 않도록, 실제 hosted Frontend deployment freshness를 `smoke-hosted-compatibility`에 포함한다.

> [!important] Acceptance
> - hosted smoke가 `AGENTFEED_HOSTED_FRONTEND_URL` 기본값 `https://agentfeed.dev`를 사용한다.
> - Frontend host DNS를 확인한다.
> - canonical root `/`가 redirect 없이 HTTP `200`을 반환해야 한다.
> - HTML이 현재 frontend repo의 `lang="ko"` layout marker와 AgentFeed/worklog landing marker를 포함해야 한다.
> - stale `/login` redirect deployment는 fail-closed 처리한다.
> - manual hosted compatibility workflow에서도 Frontend URL을 입력/출력/e2e env로 전달한다.

## RED

- `./scripts/test-hosted-compatibility-smoke.sh`
  - 실패: `AGENTFEED_HOSTED_FRONTEND_URL`, `Checking hosted Frontend deployment`, `FRONTEND_DEPLOYMENT_COMPATIBILITY_PASSED` contract 부재.
- 실제 hosted 상태 확인:
  - `agentfeed.dev` DNS resolve 됨.
  - `www.agentfeed.dev` DNS 미해결.
  - `api.agentfeed.dev` DNS 미해결.
  - `https://agentfeed.dev/`가 HTTP `307`로 `/login` redirect.
  - 현재 frontend repo에는 `/login` route가 없고 root landing은 Korean layout/landing page여야 하므로 hosted Frontend가 stale deployment일 가능성이 큼.

## 변경

- `agentfeed-dev/scripts/smoke-hosted-compatibility.sh`
  - `AGENTFEED_HOSTED_FRONTEND_URL` 추가.
  - hosted Frontend DNS preflight 추가.
  - root HTML `200`/layout marker/landing marker 검증 추가.
  - stale redirect 또는 오래된 login-gated shell을 fail-closed 메시지로 분류.
- `agentfeed-dev/scripts/test-hosted-compatibility-smoke.sh`
  - hosted Frontend source contract 추가.
  - local valid Frontend mock으로 API DNS/timeout tests가 real hosted Frontend에 의존하지 않게 보정.
  - local stale redirect Frontend mock을 fail-closed regression으로 추가.
- `agentfeed-dev/.github/workflows/hosted-compatibility.yml`
  - `frontend_url` manual input 추가.
  - configuration print와 smoke env에 `AGENTFEED_HOSTED_FRONTEND_URL` 추가.
- `agentfeed-dev/README.md`
  - hosted Frontend deployment smoke와 commercial readiness 기본 hosted URL 쌍 설명 추가.

## Evidence

- [x] `./scripts/test-hosted-compatibility-smoke.sh`
  - `hosted compatibility smoke contract passed`
- [x] `./scripts/smoke-hosted-compatibility.sh`
  - exit `1`.
  - 실패 메시지: `Frontend root request returned HTTP 307 for https://agentfeed.dev/; expected 200`.
  - 결론: 현재 stale hosted Frontend deployment를 false-green 처리하지 않음.
- [x] `./scripts/test-all.sh`
  - CLI 330 tests, Frontend CI/build/contracts/audit, Backend 292 tests, OpenAPI gate, Alembic offline chain 통과.
- [x] `AGENTFEED_COMMERCIAL_READINESS_EVIDENCE_DIR=$(mktemp -d) ./scripts/commercial-readiness.sh`
  - local cross-repo gate 통과 후 hosted Frontend 단계에서 non-zero.
  - `manifest.json`: `status=failed`, `exit_code=1`, `required_steps=[test-all, smoke-hosted-compatibility, smoke-oauth-live]`.

> [!warning] 남은 release blockers
> - `https://agentfeed.dev/`가 현재 `/login`으로 redirect되는 stale deployment 상태를 해결해야 한다.
> - `api.agentfeed.dev` DNS/deployment도 여전히 준비되어야 한다.
> - 둘 다 해결된 뒤 default `make commercial-readiness`가 `COMMERCIAL_READINESS_PASSED`를 출력해야 상용화 완료를 주장할 수 있다.

## 병렬 감사 반영

- Dev gate 감사가 `make commercial-readiness`가 public Frontend domain 누락/오래된 배포를 놓칠 수 있다고 지적했고, 이번 변경으로 hosted Frontend deployment freshness를 gate에 포함했다.
- Frontend/Backend 감사는 hosted API compatibility가 local/mock CI와 분리되어 있음을 지적했다. 이번 변경은 dev hosted smoke에 Frontend deployment proof를 추가했지만, Frontend repo 자체 CI에서 hosted API를 기본으로 강제하는 문제는 별도 slice 후보로 남긴다.
- CLI 감사는 share/publish upload 전 API metadata compatibility preflight 부재를 지적했다. 다음 slice 후보로 남긴다.
