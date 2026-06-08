---
title: CLI Ingest Status Test Mock Contract 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/cli
  - agentfeed/contract
  - agentfeed/testing
aliases:
  - CLI ingest status mock contract
---

# CLI Ingest Status Test Mock Contract 2026-06-08

## 결론

CLI completion audit 중 `npm run release:preflight`가 실패했다. 원인은 production parser가 `/v1/ingest/status`의 strict token/user lifecycle contract를 검증하도록 강화됐는데, `collect`/`share` 테스트 서버의 healthy mock response가 오래된 token-only shape를 계속 반환했기 때문이다.

> [!success] 수정 완료
> `tests/cli-collect.test.ts`와 `tests/cli-share.test.ts`의 shared healthy ingestion status mock을 현재 API contract에 맞춰 `data.user`와 token lifecycle fields까지 포함하도록 갱신했다.

## 수정 범위

- `tests/cli-collect.test.ts`
  - `handleHealthyIngestionToken()` response에 `data.user` 추가.
  - `data.token.created_at`, `last_used_at`, `expires_in_seconds` 추가.
- `tests/cli-share.test.ts`
  - `handleHealthyIngestionToken()` response에 `data.user` 추가.
  - `data.token.created_at`, `last_used_at`, `expires_in_seconds` 추가.

## 검증 evidence

- CLI targeted regression
  - `npm run build && npx vitest run tests/cli-collect.test.ts tests/cli-share.test.ts --reporter=verbose`
  - 결과: 2 test files, 74 tests passed.
- CLI release preflight
  - `npm run release:preflight`
  - 결과: 27 test files, 562 tests passed, release preflight passed.
- Frontend contract/lint
  - `npm run test:contracts && npm run lint`
  - 결과: 통과.
- Backend pytest/ruff
  - `uv run pytest && uv run ruff check .`
  - 결과: 400 tests passed, 1 warning, ruff all checks passed.

## 관련 노트

- [[CLI Ingest Status Contract Guard 2026-06-08]]
- [[CLI Ingest Status Parse Error Clarity 2026-06-08]]
- [[Frontend Project Mutation Route Guard 2026-06-08]]
- [[Active Tasks]]

## 남은 리스크

- GitHub Actions usage limit가 남아 있으면 remote CI가 step 실행 없이 실패할 수 있다. 이 경우 현재 slice의 근거는 위 로컬 full preflight/backend/frontend validation을 기준으로 한다.
