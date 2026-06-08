---
title: CLI Metadata Parse Error Clarity 2026-06-08
aliases:
  - CLI API metadata parse diagnostics
status: done
date: 2026-06-08
tags:
  - agentfeed/cli
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# CLI Metadata Parse Error Clarity 2026-06-08

> [!success]
> CLI `/metadata` compatibility check가 HTTP 200이어도 metadata 응답이 non-JSON, invalid JSON, `data` envelope 누락인 경우를 일반 “unsupported”로 뭉개지 않도록 개선했다. 이제 사용자는 API가 reachable하더라도 계약 metadata 자체가 어떻게 깨졌는지 명확히 볼 수 있다.

## 변경 범위

- `src/api/client.ts`
  - `parseMetadataData`를 `parseMetadataResponse`로 전환.
  - malformed metadata 응답을 다음처럼 명확히 구분:
    - `AgentFeed API metadata response is not JSON.`
    - `AgentFeed API metadata response contains invalid JSON.`
    - `AgentFeed API metadata response is missing the data envelope.`
  - 실제 metadata shape/contract가 unsupported인 경우에는 기존 compatibility error를 유지.
- `tests/api-hook.test.ts`
  - non-JSON / invalid JSON / missing data envelope 회귀 테스트 추가.

## 검증 Evidence

```text
npm test -- --run tests/api-hook.test.ts
=> 1 test file passed, 101 tests passed

npm run typecheck
=> tsc --noEmit passed
```

## 판단

- 신규 기능 추가가 아니라, 기존 API compatibility gate의 오류 설명력을 강화한 완성도 보완이다.
- CLI-API 계약 불일치가 발생했을 때 사용자가 “fetch failed/unsupported” 수준이 아닌 구체 원인을 확인할 수 있다.
- 서버/인프라/CICD/배포는 수행하지 않았다.

## 후행 과제

- [ ] `/ingest/status` 200 non-JSON/invalid JSON도 현재는 “invalid ingestion token status response”로 묶인다. 필요하면 같은 수준의 parse diagnostics로 분리한다.
- [ ] `postJson`/`postIngest`의 success response JSON parse 실패도 `API_RESPONSE_INVALID`로 명확화할지 별도 slice에서 검토한다.

## 관련 노트

- [[CLI Ingest Status Contract Guard 2026-06-08]]
- [[CLI Auth Approval Response Guard 2026-06-08]]
- [[Active Tasks]]
