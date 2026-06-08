---
title: CLI Ingest Request Contract Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed
  - contract
  - cli
  - backend
  - multi-agent
status: done
---

# CLI Ingest Request Contract Guard 2026-06-08

## 목적

CLI가 수집한 멀티에이전트 작업량이 Backend ingest schema에서 조용히 누락되지 않도록 Dev OpenAPI contract gate를 더 촘촘하게 만든다.

## 변경

- `agentfeed-dev/scripts/check-openapi-contract.mjs`의 CLI ingest request body contract를 확장했다.
- 다음 핵심 필드를 OpenAPI request schema에서 검증한다.
  - `worklog.category`, `outcome`, `timeline`
  - 전체 aggregate metrics: token, duration, files, lines, tests, commands, tools, skills, subagents, turns
  - 멀티에이전트 metrics: `agent_metrics[].agent/model/session_id/tokens_used/.../agent_modes`
  - 수집 출처: `collection_sources[].type/name/quality`, `collection_quality`
  - privacy scan finding 세부 필드: `id/type/severity/message/field/resolved/resolution`
- `agentfeed-dev/scripts/test-all.sh`에 `agent_metrics`, `collection_sources`, `privacy_scan.findings` contract grep guard를 추가했다.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- OpenAPI operations checked: `75`
- Client contracts checked: `70`
- Request body field contracts checked: `223 fields across 15 operations`
- Schema field contracts checked: `130 fields across 26 operations`

## 발견한 후행 과제

> [!warning]
> CLI local draft에는 `privacy_scan.findings[].sample_redacted`가 있지만 Backend/Frontend public contract에는 없다. 이 값은 redacted sample이라도 민감정보 샘플 정책과 연결되므로, 지금은 기능 변경하지 않고 별도 product/security decision으로 남긴다.

- [x] `sample_redacted`는 서버에 저장/리뷰 화면에 표시하지 않고 CLI upload sanitizer에서 서버 전송 전 명시적으로 제거한다: [[CLI Privacy Sample Upload Strip 2026-06-08]].
- [ ] 나중에 웹 리뷰에서 redacted sample 표시가 필요하면 Backend schema, persistence, Frontend review copy, privacy wording을 함께 설계한다.


## 2026-06-08 후속 보강 — CLI upload response `created_at` contract

> [!success]
> CLI `publish/share`는 upload 성공 응답의 `created_at`을 필수로 검증하고 이 값을 local draft upload metadata의 `uploaded_at`으로 저장한다. Backend `IngestResponse`에도 `created_at`이 존재하므로 Dev OpenAPI gate가 이 필드를 직접 검증하도록 보강했다.

### 추가한 계약

- `POST /v1/ingest/worklogs` response
  - `data.created_at`: required, non-null, `date-time`
- `scripts/test-all.sh` static guard
  - `scripts/check-openapi-contract.mjs` 안에 `data.created_at` contract가 유지되는지 grep guard 추가

### 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
bash -n scripts/test-all.sh
bash -lc 'grep -Fq "data.created_at" scripts/check-openapi-contract.mjs && grep -Fq "data.created_at" scripts/test-all.sh'

cd /Users/downing/PersonalProjects/AgentFeed-CLI
npx vitest run tests/api-hook.test.ts --reporter=verbose

cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest -q tests/test_contracts.py \
  -k "route_response_models_use_explicit_contract_schemas or ingest_response"
```

결과:

- Dev OpenAPI gate: pass, `Schema field contracts checked: 130 fields across 26 operations`
- CLI API client regression: `89 passed`
- Backend targeted contract: `1 passed, 371 deselected`

## 남은 리스크

> [!note]
> 이번 작업은 CLI가 이미 필수로 기대하는 Backend upload response timestamp를 contract gate에 반영한 것이다. 신규 응답 필드나 status/visibility enum 강제는 기능/스키마 정책 변경에 해당하므로 별도 설계 후 진행한다.

- [ ] `IngestResponse.status`/`visibility`를 Backend schema enum으로 좁힐지 검토한다. 현재 CLI는 private-review 상태만 수용하지만 Backend schema는 `str`로 열려 있다.
