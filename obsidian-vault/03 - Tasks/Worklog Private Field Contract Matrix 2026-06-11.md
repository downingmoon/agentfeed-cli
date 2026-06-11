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
  - privacy
  - worklog
  - enterprise-hardening
---

# Worklog Private Field Contract Matrix 2026-06-11

## 결론

`user_note`, raw `source`, `source_json`, `review_url`은 같은 worklog 관련 필드처럼 보이지만 공개 범위가 다르다. 현재 최신 소스 기준 계약은 아래처럼 맞물린다.

> [!success]
> 이번 검증에서는 신규 기능 추가 없이 기존 구현의 public/review/CLI handoff 경계를 테스트로 재확인했고, 직전 slice에서 CLI publish 응답의 private field 거부 테스트까지 추가했다.

## 계약 매트릭스

| 필드 | CLI draft/upload | Backend ingest response | Backend public card/detail | Backend owner review | Frontend public card/detail | Frontend owner review |
| --- | --- | --- | --- | --- | --- | --- |
| `user_note` | draft payload에 포함 가능. publish success 응답에는 포함 금지 | preview에서는 검증 가능, ingest success 응답에는 없음 | 항상 `None`/비공개 | `worklog.user_note`로 owner-only 노출, `preview.user_note`는 `None` | adapter가 `userNote`를 drop하고 UI는 `canEdit` + signed-in gate 필요 | review page에서 private draft/source section에 표시 |
| raw `source` | draft source/evidence로 전송 | ingest 저장용 payload. success 응답에는 없음 | `agent`, `tool_version`, `collection_quality` allowlist만 노출 | `session_id`, `local_draft_id`, `collection_window`, `collection_fingerprint` 등 review evidence 노출 | source parser/adapter가 strict parse 후 표시 가능한 evidence만 렌더 | collection evidence로 owner가 검토 가능 |
| `source_json` | API 내부 저장명. CLI publish success 응답에는 포함 금지 | Backend DB 저장 컬럼/내부명 | 응답 모델 extra forbid로 직접 노출 금지 | review route는 `source` 필드로만 노출 | API 타입 없음 | API 타입 없음 |
| `review_url` | publish success handoff 전용. trusted URL 검증 후 브라우저/clipboard side effect | `IngestResponse` 전용 | 없음 | 없음 | card/detail payload에서 파싱하지 않음. ID + trusted config로 review href 생성 | route id로 review API 호출 |

## 권위 있는 증거

### [[agentfeed-backend]]

- `app/routers/ingest.py`
  - `_ingest_response()`는 `review_url`을 포함하지만 `user_note`, `source`, `source_json`은 포함하지 않는다.
  - ingest 저장 시 `user_note=worklog_data.user_note`, `source_json=body.source.model_dump()`로 분리 저장한다.
- `app/services/worklog_public_metadata.py`
  - `build_public_worklog_source()`는 public source allowlist만 반환한다.
- `app/services/worklog_card_payload.py`
  - public card payload는 `user_note: None`, sanitized `source`를 반환한다.
- `app/routers/worklogs.py`
  - public detail은 `user_note: None`, sanitized `source`를 반환한다.
  - owner review는 `worklog.user_note`, raw `source`를 반환하고 preview에는 `user_note: None`, `private_fields: ["user_note"]`를 반환한다.

### [[agentfeed-frontend]]

- `src/lib/api-worklog-card.ts`, `src/lib/api-worklog-detail.ts`
  - card/detail contract에 `review_url` 없음.
  - `source`와 `user_note`는 API boundary에서 strict parse된다.
- `src/lib/adapters.ts`
  - public card/detail adapter는 `userNote`를 drop한다.
  - source adapter는 malformed source evidence를 조용히 숨기지 않고 실패한다.
- `src/components/pages/WorklogDetailPage.tsx`
  - author note 렌더링은 `signedIn && viewerState.canEdit` 조건을 요구한다.
  - review navigation은 payload URL이 아니라 `navigateToWorklogReview(worklogId, reviewBaseUrl, ...)`를 사용한다.
- `src/components/pages/WorklogReviewPage.tsx`
  - owner review payload의 private draft/source fields를 별도 영역에 표시한다.

### [[AgentFeed-CLI]]

- `src/api/publish-response.ts`
  - `PUBLISH_DRAFT_RESULT_FIELDS` allowlist로 upload success 응답 필드를 제한한다.
  - `review_url`은 API/review base trust 검증 및 id 일치 검증을 통과해야 한다.
- `tests/publish-response-contract.test.ts`
  - `user_note`, `source`, `source_json`이 publish success 응답에 섞이면 `API_RESPONSE_INVALID`로 거부한다.

## Fresh verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest \
  tests/test_worklog_public_source_contracts.py \
  tests/test_worklog_public_detail_privacy_contracts.py \
  tests/test_worklog_card_frontend_contracts.py \
  tests/test_worklog_review_privacy_contracts.py \
  tests/test_worklog_response_model_contracts.py \
  tests/test_ingestion_cli_contracts.py
```

Result: 22 passed.

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
```

Result: passed.

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm test -- --run tests/publish-response-contract.test.ts tests/api-hook.test.ts tests/cli-handoff-policy.test.ts
```

Result: 3 files / 135 tests passed.

## 판단

현재 이 범위에서는 CLI/API/Frontend 계약 불일치가 발견되지 않았다. 특히 `review_url`과 private review data가 섞이지 않도록 CLI와 Frontend 양쪽에서 별도로 고정되어 있고, Backend는 public payload와 owner review payload를 분리한다.

## 후행 과제

- 다음 enterprise-hardening 반복에서는 worklog `metrics`의 multi-agent token/action evidence가 Backend schema, Frontend rendering, CLI collector output 사이에서 누락 없이 이어지는지 계약 매트릭스로 검증한다.
- 서버/인프라/CICD/배포는 현재 goal 규칙상 계속 보류한다.
