---
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - deployment-smoke
  - contract
---

# Hosted Smoke Server Test Env Forwarding 2026-06-08

## 결론

개인서버 IP-only 배포 smoke 중 Frontend diagnostic compatibility helper가 실패했다. 배포된 API/Frontend 자체 문제는 아니었고, `scripts/check-api-compatibility.mjs`가 내부 compiled runner를 실행할 때 server-test HTTP 허용 env를 전달하지 않아 `review_base_url=http://161.33.171.81:13030`을 production-safe URL로 오판했다.

## 수정

- `agentfeed-frontend/scripts/check-api-compatibility.mjs`
  - runner env에 `AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD` 전달.
  - runner env에 `NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API` 전달.
- `agentfeed-frontend/scripts/check-api-compatibility.contract.test.mjs`
  - 위 두 env가 회귀로 누락되지 않도록 문자열 계약 테스트 추가.

## 검증 Evidence

```bash
npm run test:contracts
npm run lint
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_ALLOW_INSECURE_HOSTED_SMOKE=1 \
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
./scripts/smoke-hosted-compatibility.sh
```

Smoke 결과:

- `FRONTEND_DEPLOYMENT_COMPATIBILITY_PASSED`
- `BACKEND_METADATA_COMPATIBILITY_PASSED v1 2026-06-03`
- `BACKEND_READINESS_COMPATIBILITY_PASSED`
- CLI doctor: API reachable and compatible
- `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03`
- `HOSTED_COMPATIBILITY_SMOKE_PASSED`

## 후행 과제

- IP-only server-test 전용 env 조합은 문서화되어 있으나, 실제 production 도메인/HTTPS 전환 시에는 이 insecure 허용 플래그를 제거해야 한다.
- 배포 smoke에서 token missing은 정상적인 무인 smoke 상태다. 로그인 포함 E2E는 별도 OAuth 브라우저 플로우에서 검증한다.
