---
title: CLI Ingest Status Parse Error Clarity 2026-06-08
aliases:
  - CLI ingest status parse diagnostics
status: done
date: 2026-06-08
tags:
  - agentfeed/cli
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# CLI Ingest Status Parse Error Clarity 2026-06-08

> [!success]
> CLI `/ingest/status` token check가 HTTP 200이어도 status 응답이 non-JSON, invalid JSON, `data` envelope 누락인 경우를 일반 invalid status로 뭉개지 않도록 개선했다. 이제 `agentfeed doctor/status` 계열 진단에서 API reachable 상태와 status contract 파손 원인을 분리해서 볼 수 있다.

## 변경 범위

- `src/api/client.ts`
  - `parseIngestionTokenStatusData`를 `parseIngestionTokenStatusResponse`로 전환.
  - malformed status 응답을 다음처럼 명확히 구분:
    - `AgentFeed API ingestion status response is not JSON.`
    - `AgentFeed API ingestion status response contains invalid JSON.`
    - `AgentFeed API ingestion status response is missing the data envelope.`
  - 실제 lifecycle payload shape가 잘못된 경우에는 기존 `AgentFeed API returned an invalid ingestion token status response.` 유지.
- `tests/api-hook.test.ts`
  - non-JSON / invalid JSON / missing data envelope 회귀 테스트 추가.

## 검증 Evidence

```text
npm test -- --run tests/api-hook.test.ts
=> 1 test file passed, 104 tests passed

npm run typecheck
=> tsc --noEmit passed
```

## 판단

- 신규 기능 추가가 아니라 기존 CLI/API token status contract 진단 품질 보완이다.
- 서버/인프라/CICD/배포는 수행하지 않았다.
- 이전 [[CLI Metadata Parse Error Clarity 2026-06-08]]와 같은 오류 설명력 기준을 `/ingest/status`에도 적용했다.

## 후행 과제

- [ ] `postJson`/`postIngest` success response JSON parse 실패도 `API_RESPONSE_INVALID`로 명확화할지 별도 slice에서 검토한다.
- [ ] CLI doctor 출력에서 compatibility metadata parse error와 ingestion status parse error가 충분히 다른 우선순위로 보이는지 copy QA를 진행한다.

## 관련 노트

- [[CLI Metadata Parse Error Clarity 2026-06-08]]
- [[CLI Ingest Status Contract Guard 2026-06-08]]
- [[Active Tasks]]
