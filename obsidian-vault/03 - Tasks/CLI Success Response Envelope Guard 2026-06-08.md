---
title: CLI Success Response Envelope Guard 2026-06-08
aliases:
  - CLI postJson postIngest success response guard
status: done
date: 2026-06-08
tags:
  - agentfeed/cli
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# CLI Success Response Envelope Guard 2026-06-08

> [!success] 완료
> CLI가 성공 HTTP 응답을 받았더라도 JSON 파싱 실패 또는 `data` envelope 누락을 조용히 통과시키지 않고 API boundary에서 `API_RESPONSE_INVALID`로 명확히 실패하도록 보강했다.

## 변경 요약

- `src/api/client.ts`
  - `postJson` 성공 응답이 invalid JSON이면 `AgentFeed API returned an invalid JSON response.`로 실패한다.
  - `postJson` 성공 응답에 `data` envelope가 없으면 `AgentFeed API response is missing the data envelope.`로 실패한다.
  - `postIngest` 성공 응답이 invalid JSON이면 `AgentFeed API returned an invalid JSON upload response. Local draft was kept.`로 실패한다.
  - `postIngest` 성공 응답에 `data` envelope가 없으면 `AgentFeed API upload response is missing the data envelope. Local draft was kept.`로 실패한다.
  - `API_RESPONSE_INVALID`는 재시도하지 않아 malformed success response가 같은 오류를 반복 호출하지 않는다.
- `tests/api-hook.test.ts`
  - CLI auth session success response envelope 회귀 테스트 추가.
  - remote preview success response envelope 회귀 테스트 추가.
  - publish upload success response envelope 회귀 테스트 추가 및 draft pending 유지 확인.

## 검증 Evidence

```bash
npm test -- --run tests/api-hook.test.ts
# 1 test file, 110 tests passed

npm run typecheck
# tsc --noEmit passed
```

## 계약상 의미

- API가 2xx를 반환하더라도 CLI가 임의 fallback `{}` 또는 `undefined`를 downstream parser에 넘기지 않는다.
- Upload 계열 오류는 사용자가 다시 publish/share를 재시도할 수 있도록 `Local draft was kept.`를 명확히 보존한다.
- CLI/API contract mismatch가 발생했을 때 사용자에게 원인을 숨기지 않고 명확한 복구 단서가 제공된다.

## 후행 과제

- [ ] live API smoke에서 실제 hosted API가 모든 CLI success path에 `{ data: ... }` envelope를 유지하는지 주기적으로 확인한다.
