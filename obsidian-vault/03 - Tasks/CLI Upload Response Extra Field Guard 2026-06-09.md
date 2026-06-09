---
title: CLI Upload Response Extra Field Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - cli
  - contract
  - backend
  - verification
status: completed
related:
  - "[[Settings Username Boundary Validation Guard 2026-06-09]]"
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
---

# CLI Upload Response Extra Field Guard 2026-06-09

> [!success] 완료
> CLI `publish` 업로드 성공 응답이 Backend `IngestResponse` 계약보다 넓어지는 경우를 조용히 무시하지 않고 `API_RESPONSE_INVALID`로 실패하도록 막았다.

## 배경

Backend `IngestResponse`는 `extra="forbid"` 기반의 strict response contract이며, private review 업로드 응답은 아래 필드만 허용된다.

- `id`
- `status`
- `visibility`
- `review_url`
- `created_at`
- `reused_existing`

CLI는 기존에 필수값, `needs_review`/`already_uploaded`, `private`, 안전한 review URL은 검증했지만, 서버가 예상하지 않은 추가 필드를 보내면 무시했다. 이는 API drift 또는 민감한 debug payload 노출을 CLI가 탐지하지 못하는 경계였다.

## 변경

- `src/api/client.ts`
  - `PUBLISH_DRAFT_RESULT_FIELDS` allowlist 추가.
  - `parsePublishDraftResult()`가 허용되지 않은 필드가 있는 업로드 성공 응답을 `API_RESPONSE_INVALID`로 거부.
  - 기존 cached upload / duplicate upload 재사용 응답은 `reused_existing`을 계속 허용.
- `tests/api-hook.test.ts`
  - CLI visibility/private-review source contract assertion에 allowlist 확인 추가.
  - `raw_debug_payload` 같은 extra field가 포함된 upload success response를 거부하고 local draft upload 상태를 `false`로 유지하는 회귀 테스트 추가.

## 검증 증거

```bash
npm test -- --run tests/api-hook.test.ts
# Test Files 1 passed (1)
# Tests 118 passed (118)

npm run build
# tsc + ensure-bin-executable passed

npm test -- --run
# Test Files 28 passed (28)
# Tests 577 passed (577)

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70 (shared: 1, cli: 6, frontend: 63)
# Response field contracts checked: 40
```

## 배포

요청에 따라 이 작업 완료 후 개인서버 배포 1회를 진행할 예정이다.

## 후행 과제

- [ ] Backend `IngestResponse` 필드가 변경되면 CLI `PUBLISH_DRAFT_RESULT_FIELDS`, Dev OpenAPI contract gate, Frontend review contract를 동시에 갱신한다.
- [ ] Hosted server smoke에서 private review 업로드 응답 shape가 local strict parser와 동일한지 재확인한다.
