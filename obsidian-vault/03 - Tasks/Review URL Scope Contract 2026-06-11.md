---
type: task
status: done
date: 2026-06-11
repos:
  - agentfeed-frontend
  - agentfeed-backend
  - AgentFeed-CLI
tags:
  - agentfeed
  - contract
  - frontend
  - review-url
---

# Review URL Scope Contract 2026-06-11

## 결론

`review_url`은 **CLI publish 직후 브라우저 handoff를 위한 ingest 응답 전용 필드**로 유지한다. Frontend의 일반 worklog card/detail 응답은 `review_url`을 신뢰하거나 파싱하지 않고, review 화면 이동은 `worklogId`와 설정된 `reviewBaseUrl`에서 직접 생성한다.

## 확인한 계약

- [[AgentFeed-CLI]]
  - publish 응답의 `review_url`만 CLI handoff에 사용한다.
  - `trusted-url` 검증 이후에만 브라우저/클립보드 side effect를 수행한다.
- [[agentfeed-backend]]
  - `POST /v1/ingest/worklogs` 응답만 `review_url`을 반환한다.
  - `GET /v1/worklogs/{id}` public detail 및 card/list 응답에는 raw review handoff URL을 노출하지 않는다.
  - review 화면용 `GET /v1/worklogs/{id}/review`는 ID 기반 API route이며 owner-only private view다.
- [[agentfeed-frontend]]
  - card/detail API 타입은 `review_url`을 포함하지 않는다.
  - detail page는 `navigateToWorklogReview(worklogId, reviewBaseUrl, ...)`만 사용한다.
  - unsafe review base URL은 same-origin `/worklogs/{id}/review`로 fallback 된다.

## 변경 사항

- `agentfeed-frontend` commit: `00051e2 Pin frontend review URL scope contract`
  - `src/lib/worklog-review-url-scope.contract.test.ts` 추가
  - `scripts/run-contract-tests.mjs`에 계약 테스트 등록

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint && npm test
```

결과: 통과.

추가 LOC 점검:

- `scripts/run-contract-tests.mjs`: 90 pure LOC
- `src/lib/worklog-review-url-scope.contract.test.ts`: 54 pure LOC

## 남은 후행 과제

- `source`, `user_note`의 public/review scope는 기존 Backend/Frontend 테스트가 충분히 두껍게 존재한다. 다음 반복에서는 신규 기능 없이 기존 증거를 문서화하거나, 누락된 최소 source-contract 테스트만 추가한다.
- 서버 배포는 이번 goal 규칙상 보류했다.
