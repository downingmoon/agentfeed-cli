# AgentFeed CLI / Frontend / Backend Integration TODO

작성일: 2026-05-20 KST
대상 repo:

- `AgentFeed-CLI`
- `agentfeed-frontend`
- `agentfeed-backend`

## 목표 end-to-end 흐름

```text
agentfeed collect
→ agentfeed publish --open-review
→ /worklogs/{id}/review
→ privacy 확인/해결
→ publish
→ feed/profile/project에서 공개 worklog 확인
```

## P0 — 현재 end-to-end를 막는 항목

- [x] Backend ingest 응답의 `review_url`과 Frontend route를 일치시킨다.
  - Backend 현재: `/worklogs/{id}/review`
  - Frontend 기존: `/worklog/[id]`만 있음
  - 조치: Frontend에 `/worklogs/[id]/review` 페이지 추가
- [x] Frontend review page에서 아래 API를 실제로 사용한다.
  - `GET /v1/worklogs/{id}/review`
  - `POST /v1/worklogs/{id}/privacy-findings/{finding_id}/resolve`
  - `POST /v1/worklogs/{id}/publish`
- [x] Backend OAuth callback redirect와 Frontend route를 일치시킨다.
  - Backend 현재: `/dashboard`
  - Frontend 기존: `/dashboard` 없음
  - 조치: `/dashboard` page 추가 또는 callback target 변경
- [x] Header sign-in 버튼을 mock toggle이 아니라 GitHub OAuth URL로 연결한다.

## P1 — API contract drift 수정

- [x] Backend `IngestSource`에 `local_draft_id`를 추가한다.
- [x] Backend worklog card response가 Frontend card 타입과 호환되도록 `status`, `model`, `changed_areas`, `public_prompt`를 포함한다.
- [x] Backend worklog detail response에 `privacy_scan`을 포함한다.
- [x] Backend project list endpoint `GET /v1/projects`를 추가하거나 Frontend wrapper를 제거한다.
- [x] Frontend feed sort enum을 Backend와 통일한다.
  - Backend: `latest`, `trending`, `most_liked`, `most_discussed`
- [x] Frontend social API wrapper가 Backend의 `{ data: ... }` wrapper와 `likes_count/bookmarks_count` field를 unwrap한다.
- [x] Frontend project detail wrapper가 Backend의 `{ data: { project, stats } }` shape를 변환한다.
- [x] `outcome` canonical shape를 정한다.
  - 적용: CLI ingest는 `string[]` 유지, Frontend adapter가 string/object 둘 다 수용
  - 장기 권장: `{ label, value, delta, ... }[]`로 통일

## P2 — 제품 완성도

- [ ] Projects page를 mock에서 실제 API로 전환한다.
- [ ] Leaderboard page를 mock에서 실제 API로 전환한다.
- [ ] Worklog comments를 실제 API로 연결한다.
- [ ] Like/bookmark buttons를 실제 API로 연결한다.
- [x] Explore route를 구현하거나 Header 링크를 제거한다.
- [ ] CLI `doctor`가 API/token reachability를 확인한다.
- [x] CLI `preview`가 선택적으로 Backend preview endpoint를 호출할 수 있게 한다.
- [ ] CLI publish 성공 후 local draft metadata의 `worklog_id/review_url`을 기준으로 재오픈/재업로드 방지 정책을 강화한다.

## 검증 기준

- CLI: `npm test -- --run`, `npm run typecheck`
- Frontend: `npm run build` 또는 최소 `npx tsc --noEmit`
- Backend: `uv run --python 3.12 pytest`, 최소 import/contract unit tests
- 통합 smoke: CLI publish 결과 `review_url`이 실제 Frontend route로 렌더링되어야 함

## 2026-05-20 적용 내역

- Frontend `/worklogs/{id}/review` route와 Review UI 추가
- Frontend `/dashboard` route 추가
- Header GitHub OAuth 진입 연결
- Backend ingest source `local_draft_id` 보존
- Backend worklog/feed card field 보강
- Backend `GET /v1/projects` 추가
- Frontend API wrapper sort/social/project-detail contract 보정
- CLI `agentfeed preview --remote` 추가
- Frontend `/explore` placeholder route 추가

