---
type: task
status: done
date: 2026-06-11
repos:
  - AgentFeed-CLI
  - agentfeed-backend
  - agentfeed-frontend
tags:
  - agentfeed
  - contract
  - cli
  - privacy
  - publish-response
---

# Publish Response Private Field Scope 2026-06-11

## 결론

CLI publish 응답은 `review_url` handoff에 필요한 최소 필드만 받는다. Backend review 화면에서는 `user_note`와 raw `source`가 owner-only로 필요하지만, CLI upload success 응답에는 이 private/review payload가 섞이면 안 된다.

## 보강한 계약

- `parsePublishDraftResult`가 다음 필드를 포함한 upload success 응답을 `API_RESPONSE_INVALID`로 거부하도록 전용 테스트를 추가했다.
  - `user_note`
  - `source`
  - `source_json`
- 이 테스트는 기존 allowlist 구현을 문서화하는 회귀 방지 장치다.

## 변경 사항

- [[AgentFeed-CLI]]
  - `tests/publish-response-contract.test.ts` 추가

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- --run tests/publish-response-contract.test.ts
npm run typecheck && npm test -- --run && npm run build
```

결과:

- 단일 테스트: 1 file / 1 test 통과
- 전체 CLI 테스트: 37 files / 612 tests 통과
- TypeScript typecheck 통과
- build 통과

LOC 점검:

- `tests/publish-response-contract.test.ts`: 34 pure LOC

## 후행 과제

- `source`와 `user_note`의 Backend public/review scope는 기존 테스트가 충분히 존재한다. 다음 반복에서는 Backend/Frontend 증거를 하나의 계약 매트릭스로 정리하고, 실제 누락이 보일 때만 최소 테스트를 추가한다.
- 서버/인프라/CICD/배포는 현재 goal 규칙에 따라 계속 보류한다.
