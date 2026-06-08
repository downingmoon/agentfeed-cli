---
title: CLI Ingest Upload Status Contract Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/contracts
  - agentfeed/cli
  - agentfeed/backend
  - project/tasks
aliases:
  - CLI ingest upload status guard
---

# CLI Ingest Upload Status Contract Guard 2026-06-08

> [!success] 완료
> Backend `IngestResponse`는 private review upload 성공 응답을 `status: "needs_review"`, `visibility: "private"`로 닫아두고 있다. CLI remote upload parser가 과거/내부 상태인 `draft`, `private`, `already_uploaded`까지 성공 응답으로 받아주던 fail-open drift를 제거했다.

## 배경

[[CLI Privacy Severity Contract Guard 2026-06-08]] 이후 CLI-Backend ingest contract를 추가 점검하면서 upload response status guard가 Backend보다 넓은 것을 확인했다. `already_uploaded`는 CLI 로컬 캐시/duplicate reconciliation 전용 상태로는 유효하지만, API remote success response로 들어오면 Backend contract drift를 숨길 수 있다.

## 변경 범위

### CLI

- `src/api/client.ts`
  - `PublishDraftStatus`를 `needs_review | already_uploaded`로 축소.
  - remote ingest success response는 `needs_review`만 허용.
  - `already_uploaded`는 cached upload reuse와 duplicate ingest reconciliation 내부 경로에서만 명시적으로 허용.
- `tests/api-hook.test.ts`
  - remote API가 `draft`, `private`, `already_uploaded` status를 반환하면 `API_RESPONSE_INVALID`로 reject하고 local draft upload marker를 남기지 않는 regression 추가.
  - source-level guard로 remote/cache status constant 분리를 고정.

### Backend / Frontend

- Backend 코드 변경 없음. Backend `IngestResponse` contract evidence만 재검증.
- Frontend 코드 변경 없음. 이번 drift는 CLI remote upload parser에 한정.

## 검증 Evidence

```bash
# CLI targeted
npx vitest run tests/api-hook.test.ts --reporter=verbose

# Backend contract evidence
uv run pytest tests/test_contracts.py::test_ingest_response_marks_existing_worklog_reuse

# Frontend contract smoke
npm run test:contracts

# CLI full release gate
npm run release:preflight
```

- CLI targeted: `117 tests passed`.
- Backend targeted: `1 passed`.
- Frontend contract smoke: 통과.
- CLI release preflight: `27 test files`, `571 tests passed`; tarball/installed package smoke 통과.

> [!todo]
> CLI upload result display에서 `already_uploaded`가 로컬 캐시/duplicate reconciliation임을 사용자 문구로 더 명확히 보여줄지 검토한다. 신규 기능이 아니라 UX copy 개선 후보로만 보류한다.
