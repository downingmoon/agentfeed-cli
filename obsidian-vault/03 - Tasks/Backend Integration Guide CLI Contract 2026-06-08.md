---
title: Backend Integration Guide CLI Contract 2026-06-08
aliases:
  - Setup Guide CLI Command Contract
tags:
  - agentfeed/backend
  - agentfeed/cli
  - agentfeed/contracts
status: done
updated: 2026-06-08
---

# Backend Integration Guide CLI Contract 2026-06-08

## 결론

Backend `/v1/integrations/{integration_type}/setup-guide`가 더 이상 존재하지 않는 CLI 명령을 안내하지 않도록 수정했다.

기존 guide에는 다음 명령이 남아 있었다.

- `agentfeed configure codex`
- `agentfeed connect cursor`
- `agentfeed connect gemini-cli`

현재 CLI에는 별도 `configure`/`connect` command가 없고, source별 수집은 `agentfeed collect --source ... --explain` 또는 전체 share/collect flow로 처리한다. 따라서 setup guide API는 실제 shipped CLI 명령만 노출해야 한다.

## 수정 내용

- Backend `app/data/integration_guides.py`
  - Claude Code: `npm install -g agentfeed-cli` → `agentfeed login` → `agentfeed hook install claude-code` → `agentfeed share --dry` 순서로 정리.
  - Codex: `agentfeed configure codex` 제거, `agentfeed collect --source codex --explain`로 교체.
  - Cursor: `agentfeed connect cursor` 제거, `agentfeed collect --source cursor --explain`로 교체.
  - Gemini CLI: `agentfeed connect gemini-cli` 제거, `agentfeed collect --source gemini-cli --explain`로 교체.
- Backend contract test 추가
  - setup guide의 `code` snippet이 allowlist에 포함된 실제 CLI 명령인지 검증.
  - 제거된 `agentfeed configure*`, `agentfeed connect*` prefix 재등장을 차단.

## 검증 Evidence

- Backend RED: `pytest tests/test_contracts.py::test_integration_setup_guides_only_advertise_shipped_cli_commands`가 stale command 3개로 실패함을 확인.
- Backend GREEN: `.venv/bin/pytest -q tests/test_contracts.py::test_integration_setup_guides_only_advertise_shipped_cli_commands` → `1 passed`.
- Backend 전체: `.venv/bin/ruff check . && .venv/bin/pytest -q` → `399 passed, 1 warning`.
- CLI 관련 회귀: `npm run build && npm run test -- --run tests/share.test.ts tests/cli-collect.test.ts tests/agent-discovery.test.ts tests/cli-init-hook.test.ts` → `50 passed`.
- Frontend contract/lint/build:
  - `npm run test:contracts`
  - `npm run lint`
  - `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8001 npm run build`

## 남은 리스크

- 실제 npm package publish 전에는 `npm install -g agentfeed-cli`가 owner의 최종 package policy와 일치하는지 한 번 더 확인해야 한다.
- 개인 서버 배포 후 `/v1/integrations/*/setup-guide` smoke로 server runtime에 새 guide가 반영됐는지 확인한다.

관련: [[Integration - CLI Backend Frontend]], [[Active Tasks]]

## 개인 서버 배포 Evidence

2026-06-08에 최신 Backend/Frontend/CLI/dev repo를 개인 서버(`161.33.171.81`)로 sync하고 `backend`, `frontend` 컨테이너를 재시작했다.

- 배포 명령: `make server-up`
- Runtime refresh: `docker compose --env-file .env restart backend frontend`
- Backend ready: `http://161.33.171.81:18080/health/ready` → `200`
- Frontend root: `http://161.33.171.81:13030/` → `200`
- Metadata: `GET /v1/metadata` → `contract_version: 2026-06-03`, `review_base_url: http://161.33.171.81:13030`
- Feed route: `http://161.33.171.81:13030/feed` → `200`
- Setup guide smoke:
  - `claude_code`, `codex`, `cursor`, `gemini_cli`, `github`, `tokscale` 모두 조회 성공.
  - `agentfeed configure*`, `agentfeed connect*` stale command 없음.
  - Codex guide server response가 `agentfeed collect --source codex --explain`를 반환함을 확인.
- Remote compose 상태: `backend`, `frontend`, `postgres` 모두 `healthy`.
