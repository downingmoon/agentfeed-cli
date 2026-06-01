---
title: CLI Upload Timeout Reconciliation
date: 2026-06-01
tags:
  - agentfeed/cli
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# CLI Upload Timeout Reconciliation

> [!success]
> CLI publish/share upload가 첫 요청 timeout 이후 서버가 이미 draft를 수락한 경우, 재시도에서 돌아오는 duplicate ingest 응답을 검증된 성공 재동기화로 처리하는 계약을 regression test로 고정했습니다.

## 배경

AgentFeed의 핵심 경로는 로컬 draft를 Backend `/v1/ingest/worklogs`로 올리고 Frontend review URL을 사용자에게 돌려주는 흐름입니다. 네트워크 timeout은 사용자가 보기에는 실패처럼 보이지만, 서버가 이미 worklog를 저장했을 수 있어 blind failure나 blind success 모두 위험합니다.

## 변경 계약

- upload timeout은 bounded retry 대상입니다.
- timeout이 끝까지 해소되지 않으면 draft는 `upload.uploaded === false`로 남습니다.
- timeout 이후 retry에서 `409 DUPLICATE_INGESTION_SESSION`이 오면, trusted `review_url`과 worklog id가 검증된 경우에만 `already_uploaded` / `reused_existing: true`로 재동기화합니다.
- duplicate 응답의 `review_url`이 AgentFeed expected review URL 계약을 벗어나면 draft는 pending 상태로 유지됩니다.
- retry 간 `source.local_draft_id`가 바뀌지 않아 Backend idempotency key가 안정적으로 유지됩니다.
- timeout 안내 문구는 같은 publish/share command를 다시 실행하면 server-side duplicate reconciliation이 가능하다는 복구 경로를 포함합니다.

> [!warning]
> timeout 자체만으로는 업로드 성공으로 표시하지 않습니다. CLI가 local upload metadata를 persisted success로 바꾸는 시점은 정상 upload response 또는 검증된 duplicate ingest response를 받은 뒤입니다.

## 수정 파일

- `src/api/client.ts`
- `tests/api-hook.test.ts`

## 검증 증거

- `npm test -- --run tests/api-hook.test.ts -t "timeout|duplicate"` → passed, 6 tests
- `npm run typecheck` → passed
- `npm test -- --run` → passed, 261 tests
- `npm run release:preflight` → passed
- `agentfeed-dev make test` → passed
  - CLI tests/typecheck/release preflight/audit
  - Frontend CI build/contracts/audit
  - Backend ruff/pytest 226 tests/Alembic offline migration chain
  - OpenAPI contract gate

## 후속 후보

- production API packet-loss/live retry smoke를 별도 안전 환경에서 추가
- Backend duplicate ingest response에 request id와 idempotency metadata를 더 명시적으로 노출할지 검토
- npm provenance trusted publishing workflow를 실제 public repo 전환 시 별도 gate로 확정

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 CLI upload timeout reconciliation]]
- [[Active Tasks#P1 후보]]
